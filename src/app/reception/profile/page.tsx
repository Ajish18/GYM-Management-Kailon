import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default async function ReceptionProfilePage() {
  const { user, gymId } = await requireGymScope("RECEPTIONIST");

  const [dbUser, gym] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        name: true, email: true, phone: true, image: true, role: true,
        createdAt: true, lastLoginAt: true, passwordHash: true,
      },
    }),
    db.gym.findUnique({
      where: { id: gymId },
      select: { name: true, gymCode: true },
    }),
  ]);

  return (
    <ProfileView
      user={{
        id: user.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        image: dbUser.image,
        role: dbUser.role,
        createdAt: dbUser.createdAt.toISOString(),
        lastLoginAt: dbUser.lastLoginAt?.toISOString() ?? null,
        hasPassword: !!dbUser.passwordHash,
      }}
      gym={gym}
    />
  );
}
