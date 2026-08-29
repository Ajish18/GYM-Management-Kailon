import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { NotificationType } from "@prisma/client";
import type { TOGGLEABLE_NOTIFICATION_TYPES } from "@/lib/validations/notifications";

const BELL_PAGE_SIZE = 15;

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | null;
  createdAt: Date;
  /** Owner's gym-wide view only — set when the row was resolved with
   *  gymId scope so the list can show which member it belongs to. */
  userId?: string;
  memberName?: string;
};

/** Recent notifications for the bell dropdown — every role reads only its
 *  own rows (VO per docs/09 §10.15), so this always scopes by userId, never
 *  gymId alone. Wrapped in unstable_cache (15s) because the server-rendered
 *  initial value is just the paint; the client bell already re-polls every
 *  60s and refreshes on open, so a briefly-stale initial render is invisible. */
export const getRecentNotifications = unstable_cache(
  async (
    userId: string,
    limit = BELL_PAGE_SIZE,
  ): Promise<{ items: NotificationListItem[]; unreadCount: number }> => {
    const [items, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          relatedEntityType: true,
          relatedEntityId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items, unreadCount };
  },
  ["notifications-recent"],
  { revalidate: 15 },
);

export const getUnreadNotificationCount = unstable_cache(
  async (userId: string): Promise<number> => {
    return db.notification.count({ where: { userId, readAt: null } });
  },
  ["notifications-unread-count"],
  { revalidate: 15 },
);

export const NOTIFICATION_HISTORY_PAGE_SIZE = 20;

export type NotificationHistoryParams = {
  /** Own rows (every role except owner) — required unless gymId is given. */
  userId?: string;
  /** Gym-wide rows (owner only). */
  gymId?: string;
  /** Narrow a gym-wide view down to one member. */
  memberId?: string;
  page?: number;
  pageSize?: number;
  type?: string;
  search?: string;
  unreadOnly?: boolean;
};

/** Paginated notification history for the notification-center page. Own
 *  views scope by userId (VO per docs/09 §10.15); the owner's gym-wide view
 *  scopes by gymId and may be narrowed to a member. `search` does a
 *  case-insensitive contains on title/body; `type` and `unreadOnly` are
 *  exact filters. Cached 15s — notification actions revalidate relevant paths. */
export const getNotificationHistory = unstable_cache(
  async (params: NotificationHistoryParams): Promise<{
    items: NotificationListItem[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  }> => {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? NOTIFICATION_HISTORY_PAGE_SIZE));

  const scope = params.gymId ? { gymId: params.gymId } : { userId: params.userId! };
  const search = params.search?.trim();

  const where = {
    ...scope,
    ...(params.memberId ? { userId: params.memberId } : {}),
    // Filter values come from the page's type dropdown (valid enum values),
    // so a cast here is safe — Prisma would otherwise reject a plain string.
    ...(params.type ? { type: params.type as NotificationType } : {}),
    ...(params.unreadOnly ? { readAt: null } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { body: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        relatedEntityType: true,
        relatedEntityId: true,
        readAt: true,
        createdAt: true,
        userId: true,
      },
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { ...scope, readAt: null } }),
  ]);

  // Gym-wide (owner) views resolve member names so the list can show who
  // each notification is for. Own views skip this extra query.
  let memberNameById: Map<string, string> | null = null;
  if (params.gymId && rows.length > 0) {
    const memberIds = [...new Set(rows.map((r) => r.userId))];
    const members = await db.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    memberNameById = new Map(members.map((m) => [m.id, m.name ?? "Unknown"]));
  }

  const items = rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    readAt: row.readAt,
    createdAt: row.createdAt,
    userId: row.userId,
    ...(memberNameById ? { memberName: memberNameById.get(row.userId) ?? "Unknown" } : {}),
  }));

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    unreadCount,
  };
  },
  ["notifications-history"],
  { revalidate: 15 },
);

export type PreferenceMap = Partial<Record<(typeof TOGGLEABLE_NOTIFICATION_TYPES)[number], boolean>>;

/** All toggleable types default to "on" until the user explicitly opts out
 *  — NotificationPreference.preferences is free-form JSON with no row
 *  guaranteed to exist yet for a given user. */
export const getNotificationPreferences = unstable_cache(
  async (userId: string): Promise<PreferenceMap> => {
    const row = await db.notificationPreference.findUnique({ where: { userId } });
    return (row?.preferences as PreferenceMap | undefined) ?? {};
  },
  ["notifications-preferences"],
  { revalidate: 60 },
);
