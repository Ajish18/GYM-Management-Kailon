import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLeaderboard } from "@/lib/data/attendance";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const RANK_COLOR: Record<number, string> = {
  1: "text-amber-500",
  2: "text-slate-400",
  3: "text-amber-700",
};

/** Gym-scoped streak leaderboard — only members with `leaderboardOptIn`
 *  are shown, though streaks are tracked for everyone regardless of opt-in.
 *  Self-contained (fetches its own data given `gymId`) so it drops into the
 *  member dashboard or a staff-facing page alike. Pass `currentMemberId` to
 *  highlight "you" in the list. */
export async function LeaderboardList({
  gymId,
  currentMemberId,
  limit = 10,
}: {
  gymId: string;
  currentMemberId?: string;
  limit?: number;
}) {
  const entries = await getLeaderboard(gymId, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Streak leaderboard</CardTitle>
        <CardDescription>Members who’ve opted in, ranked by current streak.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has opted into the leaderboard yet.</p>
        ) : (
          <ol className="divide-y">
            {entries.map((entry) => (
              <li
                key={entry.memberId}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  entry.memberId === currentMemberId && "rounded-lg bg-muted/50 px-2",
                )}
              >
                <div className="flex w-6 shrink-0 items-center justify-center">
                  {entry.rank <= 3 ? (
                    <Trophy className={cn("h-4 w-4", RANK_COLOR[entry.rank])} />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{entry.rank}</span>
                  )}
                </div>
                <Avatar className="h-8 w-8">
                  {entry.image && <AvatarImage src={entry.image} alt={entry.name} />}
                  <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">
                    {entry.name}
                    {entry.memberId === currentMemberId && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{entry.currentStreak}d</div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
