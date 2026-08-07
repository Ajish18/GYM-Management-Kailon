import type { Metadata } from "next";
import { Flame, CalendarCheck, Wallet } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireGymScope } from "@/lib/auth/guards";
import { getMemberDashboardStats } from "@/lib/data/dashboard";
import { SelfCheckinCard } from "@/components/attendance/self-checkin-card";
import { formatDate, daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function MemberDashboardPage() {
  const { user, gymId } = await requireGymScope("MEMBER");
  const { streak, membership } = await getMemberDashboardStats(user.id);

  const expiresInDays = membership ? daysUntil(membership.endDate) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Let’s keep the streak alive.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Current streak" value={`${streak?.currentStreak ?? 0} days`} icon={Flame} accent="streak" />
        <StatCard label="Longest streak" value={`${streak?.longestStreak ?? 0} days`} icon={CalendarCheck} accent="primary" />
        <StatCard
          label="Membership"
          value={membership ? membership.plan.name : "No active plan"}
          hint={
            membership
              ? `${expiresInDays! >= 0 ? `Expires in ${expiresInDays} days` : "Expired"} · ${formatDate(membership.endDate)}`
              : "Talk to the front desk"
          }
          icon={Wallet}
          accent={membership ? "success" : "muted"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SelfCheckinCard gymId={gymId} memberId={user.id} />
        <Card>
          <CardHeader>
            <CardTitle>Today’s plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No workout assigned yet — once your trainer assigns one, it’ll show up here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
