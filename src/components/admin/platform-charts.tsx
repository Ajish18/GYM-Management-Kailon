"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// This file imports recharts and must therefore ONLY be loaded client-side
// (via gym-growth-chart-lazy.tsx). The non-chart StatusBreakdown lives in
// status-breakdown.tsx so it can be imported statically by Server pages.

/** Last 6 months of gym signups. Categorical month labels come pre-formatted
 *  from the data layer, so this is a thin recharts wrapper. */
export function GymGrowthChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym growth</CardTitle>
        <CardDescription>New gyms signed up per month (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value) => [value, "gyms"] as [string, string]}
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
