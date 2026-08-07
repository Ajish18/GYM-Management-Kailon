"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendPoint } from "./trend-chart";

// recharts is ~300KB minified. Importing it statically from the Server
// Component progress pages put that entire library in the first-load bundle
// of /member/progress and /trainer/progress (328KB each). Pulling it in
// client-side only, behind a skeleton, keeps the initial JS small and draws
// the chart asynchronously — the page is fully interactive long before the
// chart chunk arrives.
const TrendChart = dynamic(() => import("./trend-chart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full rounded-lg" />,
});

export function TrendChartLazy(props: {
  data: TrendPoint[];
  label: string;
  unit?: string;
  colorVar?: string;
}) {
  return <TrendChart {...props} />;
}
