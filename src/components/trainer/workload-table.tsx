import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dumbbell, Salad, UserCheck, Users } from "lucide-react";
import type { TrainerWorkloadRow } from "@/lib/data/trainer-workload";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Utilization({ row }: { row: TrainerWorkloadRow }) {
  if (row.utilizationPercent === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const { utilizationPercent: p } = row;
  const color = p >= 100 ? "bg-destructive" : p >= 80 ? "bg-streak" : "bg-success";
  return (
    <div className="flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${p}%` }} />
      </div>
      <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
        {p}%
      </span>
    </div>
  );
}

/** Owner view of how loaded each trainer is — assigned members vs capacity,
 *  active plans, and today's check-ins among their members. */
export function TrainerWorkloadTable({ rows }: { rows: TrainerWorkloadRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trainer workload</CardTitle>
          <CardDescription>How members and plans are distributed across trainers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
            <p className="font-medium">No trainers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add trainers and assign members to see their workload.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trainer workload</CardTitle>
        <CardDescription>
          Assigned members (vs capacity), active plan load, and today&apos;s check-ins.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Workout plans</TableHead>
                <TableHead className="text-right">Diet plans</TableHead>
                <TableHead className="text-right">Checked in today</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.trainerId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {t.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image} alt="" className="aspect-square h-full w-full object-cover" />
                        ) : (
                          <AvatarFallback className="text-xs">{initials(t.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="gap-1 tabular-nums">
                      <Users className="h-3 w-3" />
                      {t.assignedMembers}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Utilization row={t} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                      <Dumbbell className="h-3.5 w-3.5" />
                      {t.activeWorkoutPlans}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                      <Salad className="h-3.5 w-3.5" />
                      {t.activeDietPlans}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 font-medium tabular-nums text-success">
                      <UserCheck className="h-3.5 w-3.5" />
                      {t.todayCheckIns}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
