import { handle, ok } from "@/lib/api/response";
import { requireApiGymScope } from "@/lib/api/guard";
import { db } from "@/lib/db";

/** Current caller: identity, role, and gym context. Everything a client app
 *  needs to render its initial screen without guessing role/gym. */
export const GET = handle(async () => {
  const { user, gymId } = await requireApiGymScope();

  const [gym, profile, account] = await Promise.all([
    db.gym.findUnique({
      where: { id: gymId },
      select: { id: true, name: true, slug: true, gymCode: true, address: true, timezone: true, currency: true, status: true },
    }),
    user.role === "MEMBER"
      ? db.memberProfile.findUnique({ where: { userId: user.id }, select: { dob: true, gender: true } })
      : Promise.resolve(null),
    db.user.findUnique({ where: { id: user.id }, select: { phone: true, image: true } }),
  ]);

  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: account?.phone ?? null,
    role: user.role,
    image: account?.image ?? user.image ?? null,
    gym: gym ?? null,
    profile,
  });
});
