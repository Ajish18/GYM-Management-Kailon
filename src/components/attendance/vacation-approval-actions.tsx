"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { decideVacationAction } from "@/lib/actions/attendance.actions";
import type { VacationPeriodItem } from "@/lib/data/attendance";

/** Owner/Receptionist pending-vacation-requests list, with inline
 *  approve/reject actions. Approving pauses streak evaluation for the
 *  member's date range (enforced by the nightly streaks cron job). */
export function VacationApprovalActions({ requests }: { requests: VacationPeriodItem[] }) {
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const router = useRouter();

  function decide(periodId: string, decision: "APPROVED" | "REJECTED") {
    setActingId(periodId);
    startTransition(async () => {
      const result = await decideVacationAction({ periodId, decision });
      setActingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(decision === "APPROVED" ? "Vacation approved" : "Vacation rejected");
      router.refresh();
    });
  }

  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vacation requests</CardTitle>
        <CardDescription>{requests.length} pending approval</CardDescription>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {requests.map((r) => {
          const isActing = pending && actingId === r.id;
          return (
            <div key={r.id} className="flex flex-col gap-2 px-(--card-spacing) py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{r.memberName}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  {r.reason && <span> · {r.reason}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActing}
                  onClick={() => decide(r.id, "REJECTED")}
                >
                  {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Reject
                </Button>
                <Button size="sm" disabled={isActing} onClick={() => decide(r.id, "APPROVED")}>
                  {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
