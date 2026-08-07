import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { listDietNotesForPlan } from "@/lib/data/diet";
import { formatDate } from "@/lib/format";

type DietNote = Awaited<ReturnType<typeof listDietNotesForPlan>>[number];

export function DietNotesList({ notes }: { notes: DietNote[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trainer notes</CardTitle>
        <CardDescription>Adherence context from your trainer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(note.noteDate)}</span>
                <span>{note.createdBy.name}</span>
              </div>
              <p className="mt-1 text-sm">{note.note}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
