"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { exerciseSchema, type ExerciseInput } from "@/lib/validations/workouts";
import { createExerciseAction, updateExerciseAction } from "@/lib/actions/workouts.actions";
import type { Exercise } from "@prisma/client";

function toDefaults(exercise?: Exercise): ExerciseInput {
  return {
    name: exercise?.name ?? "",
    muscleGroup: exercise?.muscleGroup ?? "",
    equipment: exercise?.equipment ?? "",
    instructions: exercise?.instructions ?? "",
    mediaUrl: exercise?.mediaUrl ?? "",
  };
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isEdit = !!exercise;

  const form = useForm<ExerciseInput>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: toDefaults(exercise),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(exercise));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  async function onSubmit(values: ExerciseInput) {
    setLoading(true);
    const result = isEdit ? await updateExerciseAction(exercise.id, values) : await createExerciseAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Exercise updated" : "Exercise added");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit exercise" : "New exercise"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this exercise in your library." : "Add an exercise to your gym's library."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Barbell bench press" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="muscleGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Muscle group</FormLabel>
                    <FormControl>
                      <Input placeholder="Chest" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <FormControl>
                      <Input placeholder="Barbell" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cues, form notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Media URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add exercise"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
