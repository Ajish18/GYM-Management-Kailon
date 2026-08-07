import type { Metadata } from "next";
import { Users, CalendarCheck, Wallet, AlertCircle, UserCog, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireGymScope } from "@/lib/auth/guards";
import { getOwnerDashboardStats } from "@/lib/data/dashboard";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function OwnerDashboardPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const stats = await getOwnerDashboardStats(gymId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good to see you</h1>
        <p className="text-muted-foreground">Here’s how your gym is doing today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} accent="primary" />
        <StatCard label="Check-ins today" value={stats.todayCheckIns} icon={CalendarCheck} accent="success" />
        <StatCard
          label="Revenue this month"
          value={formatCurrency(stats.monthRevenue)}
          icon={TrendingUp}
          accent="streak"
        />
        <StatCard
          label="Pending dues"
          value={stats.pendingDuesCount}
          hint={stats.pendingDuesAmount > 0 ? formatCurrency(stats.pendingDuesAmount) : undefined}
          icon={Wallet}
          accent="muted"
        />
        <StatCard
          label="Expiring in 7 days"
          value={stats.expiringSoon}
          icon={AlertCircle}
          accent="muted"
        />
        <StatCard label="Trainers on staff" value={stats.totalTrainers} icon={UserCog} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/owner/members?new=1">Register a member</Link>} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/owner/staff?invite=1">Invite staff</Link>}
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/owner/attendance">View today’s attendance</Link>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
