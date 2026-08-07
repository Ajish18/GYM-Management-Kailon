import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { PlatformAnnouncementComposer } from "@/components/notifications/platform-announcement-composer";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireRole("PLATFORM_SUPER_ADMIN");

  const announcements = await db.platformAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform announcements</h1>
          <p className="text-muted-foreground">Broadcast to every active user across every gym.</p>
        </div>
        <PlatformAnnouncementComposer />
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-10 text-center text-sm text-muted-foreground">
              No platform announcements yet — send the first one to every gym.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">{announcement.title}</h2>
                      <Badge variant="secondary">{announcement.audience}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>Sent {formatDate(announcement.publishedAt ?? announcement.createdAt)}</div>
                    {announcement.expiresAt && (
                      <div>Expires {formatDate(announcement.expiresAt)}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
