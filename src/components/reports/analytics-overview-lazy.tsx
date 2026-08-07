"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Same treatment as progress/trend-chart-lazy.tsx: recharts creates React
// context at module scope, and in the server RSC graph `react` resolves to
// Next's vendored `react-rsc` copy which has no createContext — so statically
// importing any recharts-using component into a Server page breaks the build
// at page-data collection. Pulling this in client-side only keeps recharts
// out of the server bundle entirely; the server renders a skeleton instead.
const AnalyticsOverview = dynamic(
  () => import("./analytics-overview").then((m) => m.AnalyticsOverview),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[220px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    ),
  },
);

type AnalyticsOverviewProps = {
  revenueTrend: { month: string; value: number }[];
  membershipGrowthTrend: { month: string; value: number }[];
  attendanceTrend: { date: string; value: number }[];
  topTrainers: { trainerId: string; name: string; assignedMembers: number }[];
  topMembers: { memberId: string; name: string; currentStreak: number }[];
};

export function AnalyticsOverviewLazy(props: AnalyticsOverviewProps) {
  return <AnalyticsOverview {...props} />;
}
