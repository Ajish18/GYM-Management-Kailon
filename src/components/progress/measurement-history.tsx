"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, BadgeCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MeasurementEntry } from "@/lib/data/progress";
import { deleteMeasurementAction } from "@/lib/actions/progress.actions";
import { formatDate } from "@/lib/format";

function fmt(v: number | null, suffix = "") {
  return v === null ? "—" : `${v}${suffix}`;
}

/** `canDelete` is a defense-in-depth display toggle only — the server action
 *  itself re-checks the GYM_OWNER role regardless of what's passed here. */
export function MeasurementHistory({
  entries,
  canDelete = false,
}: {
  entries: MeasurementEntry[];
  canDelete?: boolean;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteMeasurementAction(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
        <p className="font-medium">No measurements yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Record the first entry above to start tracking progress.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>BMI</TableHead>
            <TableHead>Body fat</TableHead>
            <TableHead>Muscle</TableHead>
            <TableHead>Chest</TableHead>
            <TableHead>Waist</TableHead>
            <TableHead>Source</TableHead>
            {canDelete && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">{formatDate(entry.measuredAt)}</TableCell>
              <TableCell>{fmt(entry.weightKg, " kg")}</TableCell>
              <TableCell>{fmt(entry.bmi)}</TableCell>
              <TableCell>{fmt(entry.bodyFatPercent, "%")}</TableCell>
              <TableCell>{fmt(entry.musclePercent, "%")}</TableCell>
              <TableCell>{fmt(entry.chestCm, " cm")}</TableCell>
              <TableCell>{fmt(entry.waistCm, " cm")}</TableCell>
              <TableCell>
                {entry.source === "TRAINER" ? (
                  <Badge variant="default" className="gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    Trainer
                  </Badge>
                ) : (
                  <Badge variant="outline">Self-reported</Badge>
                )}
              </TableCell>
              {canDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Delete entry"
                  >
                    {deletingId === entry.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
