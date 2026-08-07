"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { workoutLogSetSchema } from "@/lib/validations/workouts";
import { logWorkoutAction } from "@/lib/actions/workouts.actions";
import type { ActivePlanForMember, TodayLog } from "@/lib/data/workouts";

const todayFormSchema = z.object({
  status: z.enum(["COMPLETED", "SKIPPED", "PARTIAL"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  sets: z.array(workoutLogSetSchema),
});
type TodayFormValues = z.infer<typeof todayFormSchema>;
// workoutLogSetSchema uses z.coerce for its numeric fields, so its pre-parse
// ("input") shape differs from its parsed ("output") shape — same reason
// CreatePlanFormInput exists in validations/memberships.ts. TodayFormInput is
// what react-hook-form's state holds; TodayFormValues (output) is what
// zodResolver hands to onSubmit.
type TodayFormInput = z.input<typeof todayFormSchema>;

type TemplateDay = NonNullable<NonNullable<ActivePlanForMember>["template"]>["days"][number];
type TemplateExercise = TemplateDay["exercises"][number];
type ExerciseGroup = { templateExercise: TemplateExercise; indexes: number[] };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TodayWorkoutCard({
  plan,
  todayDayIndex,
  todayLog,
  memberId,
}: {
  plan: ActivePlanForMember | null;
  todayDayIndex: number | null;
  todayLog: TodayLog | null;
  memberId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const day = plan?.template?.days[todayDayIndex ?? 0] ?? null;

  // Built once per (day, todayLog) pair — indexes here line up 1:1 with the
  // `sets` field array below, so grouping-by-exercise never depends on
  // form.watch() (which would re-derive on every keystroke).
  const { defaultValues, groups } = useMemo<{ defaultValues: TodayFormInput; groups: ExerciseGroup[] }>(() => {
    if (!day) {
      return {
        defaultValues: { status: "COMPLETED", notes: "", sets: [] },
        groups: [],
      };
    }
    const sets: TodayFormInput["sets"] = [];
    const groups: ExerciseGroup[] = [];
    for (const te of day.exercises) {
      const indexes: number[] = [];
      for (let setNumber = 1; setNumber <= te.targetSets; setNumber++) {
        const existing = todayLog?.sets.find((s) => s.exerciseId === te.exerciseId && s.setNumber === setNumber);
        indexes.push(sets.length);
        sets.push({
          exerciseId: te.exerciseId,
          setNumber,
          actualReps: existing?.actualReps ?? te.targetReps,
          actualWeight: existing?.actualWeight != null ? Number(existing.actualWeight) : Number(te.targetWeight ?? 0),
        });
      }
      groups.push({ templateExercise: te, indexes });
    }
    return {
      defaultValues: { status: (todayLog?.status ?? "COMPLETED") as TodayFormValues["status"], notes: todayLog?.notes ?? "", sets },
      groups,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the day or existing log identity changes
  }, [day?.id, todayLog?.id]);

  const form = useForm<TodayFormInput, unknown, TodayFormValues>({
    resolver: zodResolver(todayFormSchema),
    defaultValues,
    values: defaultValues,
  });
  const setsArray = useFieldArray({ control: form.control, name: "sets" });

  if (!plan || !plan.template || !day) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today’s workout</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No workout is scheduled for today — check back once your trainer adds days to your plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: TodayFormValues) {
    if (!plan) return;
    setLoading(true);
    const result = await logWorkoutAction({
      workoutPlanId: plan.id,
      memberId,
      logDate: todayISO(),
      status: values.status,
      notes: values.notes,
      sets: values.sets,
    });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data.newPrExerciseIds.length > 0) {
      toast.success(
        `New personal record! (${result.data.newPrExerciseIds.length} exercise${
          result.data.newPrExerciseIds.length > 1 ? "s" : ""
        })`,
      );
    } else {
      toast.success("Workout logged");
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today’s workout — {day.label}</CardTitle>
        <CardDescription>{plan.template.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {groups.map(({ templateExercise, indexes }) => (
              <div key={templateExercise.id} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{templateExercise.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: {templateExercise.targetSets} × {templateExercise.targetReps}
                      {templateExercise.targetWeight ? ` @ ${Number(templateExercise.targetWeight)}kg` : ""}
                      {templateExercise.restSeconds ? ` · ${templateExercise.restSeconds}s rest` : ""}
                    </p>
                  </div>
                  {todayLog?.sets.some((s) => s.exerciseId === templateExercise.exerciseId && s.isPr) && (
                    <Badge variant="secondary">
                      <Trophy className="h-3 w-3" />
                      PR
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                </div>
                {indexes.map((i) => (
                  <div key={setsArray.fields[i]?.id ?? i} className="grid grid-cols-3 gap-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      #{String(form.getValues(`sets.${i}.setNumber`) || i + 1)}
                    </div>
                    <FormField
                      control={form.control}
                      name={`sets.${i}.actualReps`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" min="0" {...field} value={field.value as number} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`sets.${i}.actualWeight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" min="0" step="0.5" {...field} value={field.value as number} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            ))}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                      <SelectItem value="SKIPPED">Skipped</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="How did it feel?" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {todayLog ? "Update log" : "Log workout"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
