"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// See reports/analytics-overview-lazy.tsx — recharts can't be statically
// imported into a Server page (its module-scope createContext breaks against
// the RSC react in the server bundle), so the chart loads client-side only.
const GymGrowthChart = dynamic(
  () => import("./platform-charts").then((m) => m.GymGrowthChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
  },
);

export function GymGrowthChartLazy({ data }: { data: { label: string; count: number }[] }) {
  return <GymGrowthChart data={data} />;
}
