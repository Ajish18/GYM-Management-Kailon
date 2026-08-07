import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { listSupplementsForMember } from "@/lib/data/diet";

type Supplement = Awaited<ReturnType<typeof listSupplementsForMember>>[number];

export function SupplementList({ supplements }: { supplements: Supplement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplements</CardTitle>
        <CardDescription>Recommended by your trainer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {supplements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supplements recommended yet.</p>
        ) : (
          supplements.map((sup) => (
            <div key={sup.id} className="rounded-lg border p-3">
              <p className="font-medium">{sup.name}</p>
              <p className="text-xs text-muted-foreground">
                {[sup.dosage, sup.timingNote].filter(Boolean).join(" · ") || "No dosage/timing noted"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
