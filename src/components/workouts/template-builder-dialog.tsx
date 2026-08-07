"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  createTemplateSchema,
  type CreateTemplateFormInput,
  type CreateTemplateInput,
} from "@/lib/validations/workouts";
import { createTemplateAction, updateTemplateAction } from "@/lib/actions/workouts.actions";
import type { TemplateWithDays } from "@/lib/data/workouts";

type ExerciseOption = { id: string; name: string; muscleGroup: string | null };

const emptyExercise = {
  exerciseId: "",
  targetSets: 3,
  targetReps: 10,
  targetWeight: 0,
  restSeconds: 60,
  sortOrder: 0,
};

function blankDay(order: number) {
  return { label: `Day ${order}`, dayOrder: order, exercises: [{ ...emptyExercise }] };
}

function toDefaults(template?: TemplateWithDays): CreateTemplateFormInput {
  if (!template) return { name: "", description: "", days: [blankDay(1)] };
  return {
    name: template.name,
    description: template.description ?? "",
    days: template.days.map((d) => ({
      label: d.label,
      dayOrder: d.dayOrder,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetWeight: e.targetWeight ? Number(e.targetWeight) : 0,
        restSeconds: e.restSeconds ?? 0,
        sortOrder: e.sortOrder,
      })),
    })),
  };
}

export function TemplateBuilderDialog({
  open,
  onOpenChange,
  exercises,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseOption[];
  template?: TemplateWithDays;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!template;

  const form = useForm<CreateTemplateFormInput, unknown, CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: toDefaults(template),
  });

  const dayArray = useFieldArray({ control: form.control, name: "days" });

  useEffect(() => {
    if (open) form.reset(toDefaults(template));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  async function onSubmit(values: CreateTemplateInput) {
    // Day order and per-day exercise order are driven by array position
    // (see the "Order" input + the up/down controls below), not manually
    // typed sortOrder — normalize both right before submit so they always
    // match what's on screen regardless of how the fields got there.
    const normalized: CreateTemplateInput = {
      ...values,
      days: values.days.map((day, dayIndex) => ({
        ...day,
        dayOrder: day.dayOrder || dayIndex + 1,
        exercises: day.exercises.map((ex, exIndex) => ({ ...ex, sortOrder: exIndex })),
      })),
    };

    setLoading(true);
    const result =
      isEdit && template
        ? await updateTemplateAction({ templateId: template.id, ...normalized })
        : await createTemplateAction(normalized);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Template updated" : "Template created");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit workout template" : "New workout template"}</DialogTitle>
          <DialogDescription>Build out training days and the exercises assigned to each.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template name</FormLabel>
                  <FormControl>
                    <Input placeholder="Push Pull Legs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Who this is for, goals, notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-4">
              {dayArray.fields.map((dayField, dayIndex) => (
                <TemplateDayFields
                  key={dayField.id}
                  control={form.control}
                  dayIndex={dayIndex}
                  exercises={exercises}
                  onRemoveDay={dayArray.fields.length > 1 ? () => dayArray.remove(dayIndex) : undefined}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => dayArray.append(blankDay(dayArray.fields.length + 1))}
              >
                <Plus className="h-4 w-4" />
                Add day
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDayFields({
  control,
  dayIndex,
  exercises,
  onRemoveDay,
}: {
  control: Control<CreateTemplateFormInput>;
  dayIndex: number;
  exercises: ExerciseOption[];
  onRemoveDay?: () => void;
}) {
  const exerciseArray = useFieldArray({ control, name: `days.${dayIndex}.exercises` });

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex items-end gap-3">
        <FormField
          control={control}
          name={`days.${dayIndex}.label`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Day label</FormLabel>
              <FormControl>
                <Input placeholder="Push day" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`days.${dayIndex}.dayOrder`}
          render={({ field }) => (
            <FormItem className="w-24">
              <FormLabel>Order</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} value={field.value as number} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {onRemoveDay && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemoveDay}
            className="mb-0.5"
            aria-label="Remove day"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {exerciseArray.fields.map((exField, exIndex) => (
          <div
            key={exField.id}
            className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 sm:grid-cols-[1.6fr_0.8fr_0.8fr_0.9fr_0.9fr_auto]"
          >
            <FormField
              control={control}
              name={`days.${dayIndex}.exercises.${exIndex}.exerciseId`}
              render={({ field }) => (
                <FormItem className="col-span-2 sm:col-span-1">
                  <FormLabel className="text-xs">Exercise</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`days.${dayIndex}.exercises.${exIndex}.targetSets`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Sets</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`days.${dayIndex}.exercises.${exIndex}.targetReps`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Reps</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`days.${dayIndex}.exercises.${exIndex}.targetWeight`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.5" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`days.${dayIndex}.exercises.${exIndex}.restSeconds`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Rest (s)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="5" {...field} value={field.value as number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end justify-end gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={exIndex === 0}
                onClick={() => exerciseArray.move(exIndex, exIndex - 1)}
                aria-label={`Move exercise ${exIndex + 1} up`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={exIndex === exerciseArray.fields.length - 1}
                onClick={() => exerciseArray.move(exIndex, exIndex + 1)}
                aria-label={`Move exercise ${exIndex + 1} down`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              {exerciseArray.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => exerciseArray.remove(exIndex)}
                  aria-label={`Remove exercise ${exIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => exerciseArray.append({ ...emptyExercise, sortOrder: exerciseArray.fields.length })}
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </Button>
      </div>
    </div>
  );
}
