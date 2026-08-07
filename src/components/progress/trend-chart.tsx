"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatDate } from "@/lib/format";

export type TrendPoint = { date: Date; value: number | null };

/** One metric, one series — a legend would be redundant here since the card
 *  title already names the single series; kept to recharts defaults for
 *  hover/tooltip so trends are still explorable point-by-point. */
export function TrendChart({
  data,
  label,
  unit,
  colorVar = "--chart-1",
}: {
  data: TrendPoint[];
  label: string;
  unit?: string;
  colorVar?: string;
}) {
  const points = data
    .filter((d): d is { date: Date; value: number } => d.value !== null)
    .map((d) => ({ date: d.date.getTime(), value: d.value }))
    .sort((a, b) => a.date - b.date);

  return (
    <div className="w-full">
      <p className="mb-2 text-sm font-medium">
        {label}
        {unit ? ` (${unit})` : ""}
      </p>
      {points.length < 2 ? (
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Not enough entries yet to chart {label.toLowerCase()}
        </div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => formatDate(new Date(v))}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={36}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--foreground)" }}
                labelFormatter={(v) => formatDate(new Date(v as number))}
                formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, label] as [string, string]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={`var(${colorVar})`}
                strokeWidth={2}
                dot={{ r: 3, fill: `var(${colorVar})`, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
