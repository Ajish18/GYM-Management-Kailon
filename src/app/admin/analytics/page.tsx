import type { Metadata } from "next";
import { Building2, Users, UserCog, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPlatformAnalytics } from "@/lib/data/platform";
import { StatCard } from "@/components/dashboard/stat-card";
import { GymGrowthChartLazy } from "@/components/admin/gym-growth-chart-lazy";
import { StatusBreakdown } from "@/components/admin/status-breakdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Platform Analytics" };

const STATUS_PILL: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Trial: "bg-streak/10 text-streak",
  Suspended: "bg-destructive/10 text-destructive",
  Closed: "bg-muted text-muted-foreground",
};

export default async function AdminAnalyticsPage() {
  await requireRole("PLATFORM_SUPER_ADMIN");
  const analytics = await getPlatformAnalytics();
  const { totals } = analytics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform analytics</h1>
        <p className="text-muted-foreground">
          Members, revenue, and growth across every gym running on Kailon.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total gyms" value={totals.gyms} icon={Building2} accent="primary" />
        <StatCard label="Members" value={totals.members} icon={Users} accent="success" />
        <StatCard label="Trainers" value={totals.trainers} icon={UserCog} accent="streak" />
        <StatCard
          label="Monthly revenue"
          value={formatCurrency(totals.monthlyRevenue)}
          icon={Wallet}
          hint={`${totals.activeSubscriptions} active subscriptions`}
          accent="muted"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <GymGrowthChartLazy data={analytics.gymsPerMonth} />
        </div>
        <div className="lg:col-span-2">
          <StatusBreakdown data={analytics.statusBreakdown} total={totals.gyms} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gyms</CardTitle>
          <CardDescription>Every tenant, newest first — plan, headcount, and MRR.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gym</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Trainers</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.gyms.map((g) => (
                  <TableRow key={g.gymId}>
                    <TableCell className="font-medium">{g.gymName}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_PILL[g.status] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {g.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{g.planName}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.members}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.trainers}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(g.mrr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
