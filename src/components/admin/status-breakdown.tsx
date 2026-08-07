"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Trial: "bg-streak",
  Active: "bg-success",
  Suspended: "bg-destructive",
  Closed: "bg-muted",
};

/** Subscription status of every gym as proportional bars — the platform's
 *  health check at a glance. Kept in its own file (no recharts) so Server
 *  pages can import it statically. */
export function StatusBreakdown({
  data,
  total,
}: {
  data: { status: string; count: number }[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym status</CardTitle>
        <CardDescription>How the platform&apos;s gyms are distributed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No gyms yet.</p>
        ) : (
          data.map((d) => {
            const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
            return (
              <div key={d.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{d.status}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {d.count} · {pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", STATUS_COLORS[d.status] ?? "bg-muted")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
