"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  recordMeasurementSchema,
  type RecordMeasurementInput,
  type RecordMeasurementFormInput,
} from "@/lib/validations/progress";
import { recordMeasurementAction } from "@/lib/actions/progress.actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const FIELDS: Array<{ name: keyof RecordMeasurementFormInput; label: string; step?: string }> = [
  { name: "weightKg", label: "Weight (kg)", step: "0.1" },
  { name: "heightCm", label: "Height (cm)", step: "0.1" },
  { name: "bodyFatPercent", label: "Body fat %", step: "0.1" },
  { name: "musclePercent", label: "Muscle %", step: "0.1" },
  { name: "chestCm", label: "Chest (cm)", step: "0.1" },
  { name: "waistCm", label: "Waist (cm)", step: "0.1" },
  { name: "shoulderCm", label: "Shoulder (cm)", step: "0.1" },
  { name: "armsCm", label: "Arms (cm)", step: "0.1" },
  { name: "legsCm", label: "Legs (cm)", step: "0.1" },
];

/** Shared by the Member self-entry page and the Trainer recording page for
 *  an assigned member — `memberId` is only sent to the server when present,
 *  the action always ignores it for MEMBER callers and uses their own id. */
export function MeasurementForm({
  memberId,
  title = "Record a measurement",
  description = "All fields are optional — enter at least one.",
}: {
  memberId?: string;
  title?: string;
  description?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<RecordMeasurementFormInput, unknown, RecordMeasurementInput>({
    resolver: zodResolver(recordMeasurementSchema),
    defaultValues: {
      memberId,
      measuredAt: todayIso(),
      weightKg: "",
      heightCm: "",
      bodyFatPercent: "",
      musclePercent: "",
      chestCm: "",
      waistCm: "",
      shoulderCm: "",
      armsCm: "",
      legsCm: "",
    },
  });

  async function onSubmit(values: RecordMeasurementInput) {
    setLoading(true);
    const result = await recordMeasurementAction({ ...values, memberId });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Measurement recorded");
    form.reset({
      memberId,
      measuredAt: todayIso(),
      weightKg: "",
      heightCm: "",
      bodyFatPercent: "",
      musclePercent: "",
      chestCm: "",
      waistCm: "",
      shoulderCm: "",
      armsCm: "",
      legsCm: "",
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="measuredAt"
              render={({ field }) => (
                <FormItem className="max-w-48">
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} max={todayIso()} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {FIELDS.map(({ name, label, step }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={step}
                          inputMode="decimal"
                          placeholder="—"
                          {...field}
                          value={field.value as string}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save measurement
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
