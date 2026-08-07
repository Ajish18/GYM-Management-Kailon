import { AppShell } from "@/components/app-shell/app-shell";
import { requireRole } from "@/lib/auth/guards";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PLATFORM_SUPER_ADMIN");

  return (
    <AppShell
      navKey="admin"
      roleLabel="Platform Admin"
      user={{ name: user.name ?? "Admin", email: user.email, image: user.image }}
      notificationBell={<NotificationBell />}
    >
      {children}
    </AppShell>
  );
}
