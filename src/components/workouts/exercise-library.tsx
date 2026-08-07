"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExerciseFormDialog } from "@/components/workouts/exercise-form-dialog";
import { toggleExerciseActiveAction } from "@/lib/actions/workouts.actions";
import type { Exercise } from "@prisma/client";

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.muscleGroup ?? "").toLowerCase().includes(q) ||
        (e.equipment ?? "").toLowerCase().includes(q),
    );
  }, [exercises, query]);

  async function onToggle(id: string, isActive: boolean) {
    const result = await toggleExerciseActiveAction(id, isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New exercise
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No exercises found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add exercises to your library, then use them in workout templates.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exercise</TableHead>
                <TableHead>Muscle group</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium">{exercise.name}</TableCell>
                  <TableCell className="text-muted-foreground">{exercise.muscleGroup ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{exercise.equipment ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={exercise.gymId ? "outline" : "secondary"}>
                      {exercise.gymId ? "Your gym" : "Shared library"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={exercise.isActive}
                      disabled={!exercise.gymId}
                      onCheckedChange={(checked) => onToggle(exercise.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    {exercise.gymId && (
                      <Button variant="ghost" size="sm" onClick={() => setEditing(exercise)}>
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExerciseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ExerciseFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        exercise={editing ?? undefined}
      />
    </div>
  );
}
