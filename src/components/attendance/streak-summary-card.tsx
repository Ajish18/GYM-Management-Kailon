import { Flame, Snowflake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberStreak } from "@/lib/data/attendance";

/** Member's streak summary. Self-contained (fetches its own data given
 *  `gymId`/`memberId`) so it can be dropped into the member dashboard
 *  without the caller needing to wire up data-fetching. Earned badges are
 *  rendered by BadgeGrid. */
export async function StreakSummaryCard({ gymId, memberId }: { gymId: string; memberId: string }) {
  const streak = await getMemberStreak(gymId, memberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Streak</CardTitle>
        <CardDescription>Keep showing up to grow your streak.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-2xl font-semibold tracking-tight">
              <Flame className="h-5 w-5 text-orange-500" />
              {streak?.currentStreak ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Current</p>
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight">{streak?.longestStreak ?? 0}</div>
            <p className="text-xs text-muted-foreground">Longest</p>
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight">{streak?.currentMonthStreak ?? 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-2xl font-semibold tracking-tight">
              <Snowflake className="h-5 w-5 text-sky-500" />
              {streak?.streakFreezesRemaining ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Freezes left</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
