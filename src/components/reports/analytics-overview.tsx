import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportEmptyState, ReportSection } from "@/components/reports/report-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Users, UserCheck } from "lucide-react";

/** Tiny line/bar chart used by the overview cards. Categorical x-axis (month
 *  or day labels are already pre-formatted by the data layer), so this stays
 *  a light wrapper around recharts — no date parsing here. */
function MiniChart({
  data,
  colorVar = "--chart-1",
  bars = false,
}: {
  data: { label: string; value: number }[];
  colorVar?: string;
  bars?: boolean;
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {bars ? (
          <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value) => [value, ""] as [string, string]}
            />
            <Bar dataKey="value" fill={`var(${colorVar})`} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value) => [value, ""] as [string, string]}
            />
            <Line type="monotone" dataKey="value" stroke={`var(${colorVar})`} strokeWidth={2} dot={{ r: 3, fill: `var(${colorVar})`, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Reports Overview — the default landing tab. Charts for revenue,
 *  membership growth and attendance, plus the top-trainers and top-streak
 *  leaderboards. All data is computed server-side (see lib/data/reports.ts),
 *  so this is purely presentational. */
export function AnalyticsOverview({
  revenueTrend,
  membershipGrowthTrend,
  attendanceTrend,
  topTrainers,
  topMembers,
}: {
  revenueTrend: { month: string; value: number }[];
  membershipGrowthTrend: { month: string; value: number }[];
  attendanceTrend: { date: string; value: number }[];
  topTrainers: { trainerId: string; name: string; assignedMembers: number }[];
  topMembers: { memberId: string; name: string; currentStreak: number }[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ReportSection title="Revenue trend" description="Last 6 months">
          {revenueTrend.length === 0 ? (
            <ReportEmptyState title="No revenue yet" description="Payments will appear here as members pay." />
          ) : (
            <MiniChart data={revenueTrend.map((p) => ({ label: p.month, value: p.value }))} colorVar="--chart-1" />
          )}
        </ReportSection>

        <ReportSection title="Membership growth" description="New members per month">
          {membershipGrowthTrend.length === 0 ? (
            <ReportEmptyState title="No growth data" description="Member registrations will appear here." />
          ) : (
            <MiniChart data={membershipGrowthTrend.map((p) => ({ label: p.month, value: p.value }))} colorVar="--chart-2" bars />
          )}
        </ReportSection>

        <ReportSection title="Daily check-ins" description="Last 30 days">
          {attendanceTrend.length === 0 ? (
            <ReportEmptyState title="No check-ins" description="Attendance will appear here as members check in." />
          ) : (
            <MiniChart data={attendanceTrend.map((p) => ({ label: p.date.slice(5), value: p.value }))} colorVar="--chart-3" bars />
          )}
        </ReportSection>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ReportSection title="Top trainers" description="By assigned member count" actions={<TrendingUp className="h-4 w-4 text-muted-foreground" />}>
          {topTrainers.length === 0 ? (
            <ReportEmptyState title="No trainers yet" description="Add trainers and assign members to see rankings." />
          ) : (
            <ol className="divide-y">
              {topTrainers.map((t, i) => (
                <li key={t.trainerId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span className="text-sm text-muted-foreground">{t.assignedMembers} members</span>
                </li>
              ))}
            </ol>
          )}
        </ReportSection>

        <ReportSection title="Top streaks" description="Members with the longest current streak" actions={<Users className="h-4 w-4 text-muted-foreground" />}>
          {topMembers.length === 0 ? (
            <ReportEmptyState title="No streaks yet" description="Members earn streaks by checking in regularly." />
          ) : (
            <ol className="divide-y">
              {topMembers.map((m, i) => (
                <li key={m.memberId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground">{i + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.name}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-streak">
                    <UserCheck className="h-4 w-4" />
                    {m.currentStreak} day{m.currentStreak === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ReportSection>
      </div>
    </div>
  );
}
