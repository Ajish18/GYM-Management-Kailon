import { Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMemberBadges } from "@/lib/data/attendance";
import { formatDate } from "@/lib/format";

/** Member's earned badges/achievements. Self-contained (fetches its own
 *  data given `gymId`/`memberId`) with a proper empty state before any
 *  badge has been earned. */
export async function BadgeGrid({ gymId, memberId }: { gymId: string; memberId: string }) {
  const badges = await getMemberBadges(gymId, memberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Badges</CardTitle>
        <CardDescription>Achievements earned by keeping your streak alive.</CardDescription>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
            <Award className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No badges yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Keep your streak alive to earn your first badge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {badges.map((b) => (
              <div key={b.id} className="flex items-start gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  {b.description && <p className="mt-0.5 text-xs text-muted-foreground">{b.description}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">Earned {formatDate(b.awardedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
