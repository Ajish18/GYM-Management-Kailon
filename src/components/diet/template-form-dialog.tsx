"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createTemplateSchema,
  type CreateTemplateInput,
  type CreateTemplateFormInput,
} from "@/lib/validations/diet";
import { createTemplateAction, updateTemplateAction } from "@/lib/actions/diet.actions";
import type { DietTemplateWithMeals } from "@/lib/data/diet";

const emptyMeal = { mealName: "", timeSlot: "", calories: "", proteinG: "", carbsG: "", fatG: "", sortOrder: 0 };

export function TemplateFormDialog({
  template,
  trigger,
}: {
  template?: DietTemplateWithMeals;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateTemplateFormInput, unknown, CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: template
      ? {
          name: template.name,
          description: template.description ?? "",
          meals: template.meals.map((m, i) => ({
            mealName: m.mealName,
            timeSlot: m.timeSlot ?? "",
            calories: m.calories != null ? m.calories : "",
            proteinG: m.proteinG != null ? Number(m.proteinG) : "",
            carbsG: m.carbsG != null ? Number(m.carbsG) : "",
            fatG: m.fatG != null ? Number(m.fatG) : "",
            sortOrder: m.sortOrder ?? i,
          })),
        }
      : { name: "", description: "", meals: [emptyMeal] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "meals" });

  async function onSubmit(values: CreateTemplateInput) {
    setLoading(true);
    const result = template
      ? await updateTemplateAction({ ...values, templateId: template.id })
      : await createTemplateAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(template ? "Template updated" : "Template created");
    setOpen(false);
    if (!template) form.reset({ name: "", description: "", meals: [emptyMeal] });
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.clearErrors();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{template ? `Edit ${template.name}` : "New diet template"}</DialogTitle>
          <DialogDescription>
            {template
              ? "Changes here only affect future assignments — members already on this plan keep what they were given."
              : "Build a reusable meal plan you can assign to any member."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lean bulk — 2400 kcal" {...field} />
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
                    <Textarea placeholder="Who this plan suits, general notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Meals</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...emptyMeal, sortOrder: fields.length })}
                >
                  <Plus className="h-4 w-4" />
                  Add meal
                </Button>
              </div>

              {form.formState.errors.meals?.root?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.meals.root.message}</p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`meals.${index}.mealName`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Meal name</FormLabel>
                          <FormControl>
                            <Input placeholder="Breakfast" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`meals.${index}.timeSlot`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Time slot</FormLabel>
                          <FormControl>
                            <Input placeholder="7:30 AM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label={`Remove meal ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField
                      control={form.control}
                      name={`meals.${index}.calories`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calories</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} value={field.value as string | number} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`meals.${index}.proteinG`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protein (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              {...field}
                              value={field.value as string | number}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`meals.${index}.carbsG`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carbs (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              {...field}
                              value={field.value as string | number}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`meals.${index}.fatG`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fat (g)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              {...field}
                              value={field.value as string | number}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {template ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
