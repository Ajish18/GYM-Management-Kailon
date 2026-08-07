import { AppShell } from "@/components/app-shell/app-shell";
import { requireGymScope } from "@/lib/auth/guards";
import { getGymMeta } from "@/lib/data/gym";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { user, gymId } = await requireGymScope("TRAINER");
  const gym = await getGymMeta(gymId);

  return (
    <AppShell
      navKey="trainer"
      roleLabel="Trainer"
      gymName={gym?.name}
      gymCode={gym?.gymCode}
      user={{ name: user.name ?? "Trainer", email: user.email, image: user.image }}
      notificationBell={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}
