import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VacationRequestDialog } from "@/components/attendance/vacation-request-dialog";
import { listMemberVacationPeriods } from "@/lib/data/attendance";
import { formatDate } from "@/lib/format";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
};

/** Member's vacation mode: request a period (which pauses streak evaluation)
 *  plus a history of past requests. Self-contained — the request dialog
 *  derives the member from the session, only the history needs `memberId`. */
export async function VacationCard({ gymId, memberId }: { gymId: string; memberId: string }) {
  const periods = await listMemberVacationPeriods(gymId, memberId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vacation mode</CardTitle>
        <CardDescription>Freeze your streak while you are away.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VacationRequestDialog />
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vacation periods yet.</p>
        ) : (
          <ul className="space-y-2">
            {periods.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatDate(p.startDate)} → {formatDate(p.endDate)}
                  </p>
                  {p.reason && <p className="text-xs text-muted-foreground">{p.reason}</p>}
                </div>
                <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
