"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TemplateBuilderDialog } from "@/components/workouts/template-builder-dialog";
import { AssignPlanDialog } from "@/components/workouts/assign-plan-dialog";
import { toggleTemplateActiveAction } from "@/lib/actions/workouts.actions";
import type { TemplateWithDays } from "@/lib/data/workouts";

type ExerciseOption = { id: string; name: string; muscleGroup: string | null };
type MemberOption = { id: string; name: string };

export function TemplatesList({
  templates,
  exercises,
  members,
}: {
  templates: TemplateWithDays[];
  exercises: ExerciseOption[];
  members: MemberOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithDays | null>(null);
  const [assigning, setAssigning] = useState<TemplateWithDays | null>(null);
  const router = useRouter();

  async function onToggle(id: string, isActive: boolean) {
    const result = await toggleTemplateActiveAction(id, isActive);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No workout templates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a template with training days and exercises, then assign it to members.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={(checked) => onToggle(template.id, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {template.days.map((day) => (
                    <Badge key={day.id} variant="outline">
                      {day.label} · {day.exercises.length} ex
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(template)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    disabled={!template.isActive || members.length === 0}
                    onClick={() => setAssigning(template)}
                  >
                    <Dumbbell className="h-4 w-4" />
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateBuilderDialog open={createOpen} onOpenChange={setCreateOpen} exercises={exercises} />
      <TemplateBuilderDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        exercises={exercises}
        template={editing ?? undefined}
      />
      <AssignPlanDialog
        open={!!assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        members={members}
        templates={assigning ? [{ id: assigning.id, name: assigning.name }] : []}
        preselectedTemplateId={assigning?.id}
      />
    </div>
  );
}
