"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  updateGymSettingsSchema,
  type UpdateGymSettingsInput,
  type UpdateGymSettingsFormInput,
} from "@/lib/validations/settings";
import { updateGymSettingsAction } from "@/lib/actions/settings.actions";

type GymSettingsValues = {
  attendanceGraceMinutes: number;
  maxSessionHours: number;
  selfCheckinEnabled: boolean;
  streakRequiresCheckin: boolean;
  streakRequiresWorkoutLog: boolean;
  streakRequiresCheckout: boolean;
  streakFreezesPerMonth: number;
  invoicePrefix: string;
  defaultTaxPercent: number | string;
  paymentDueInDays: number;
};

export function GymSettingsForm({ initial }: { initial: GymSettingsValues }) {
  const [loading, setLoading] = useState(false);

  const form = useForm<UpdateGymSettingsFormInput, unknown, UpdateGymSettingsInput>({
    resolver: zodResolver(updateGymSettingsSchema),
    defaultValues: {
      attendanceGraceMinutes: initial.attendanceGraceMinutes,
      maxSessionHours: initial.maxSessionHours,
      selfCheckinEnabled: initial.selfCheckinEnabled,
      streakRequiresCheckin: initial.streakRequiresCheckin,
      streakRequiresWorkoutLog: initial.streakRequiresWorkoutLog,
      streakRequiresCheckout: initial.streakRequiresCheckout,
      streakFreezesPerMonth: initial.streakFreezesPerMonth,
      invoicePrefix: initial.invoicePrefix,
      defaultTaxPercent: Number(initial.defaultTaxPercent),
      paymentDueInDays: initial.paymentDueInDays,
    },
  });

  async function onSubmit(values: UpdateGymSettingsInput) {
    setLoading(true);
    const result = await updateGymSettingsAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym configuration</CardTitle>
        <CardDescription>Attendance, streaks, and invoicing defaults for your gym.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="attendanceGraceMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in grace period (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxSessionHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max session length (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} value={field.value as number} />
                    </FormControl>
                    <FormDescription>Auto check-out after this long.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="streakFreezesPerMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Streak freezes / month</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTaxPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default tax %</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoicePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="INV" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDueInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment due in (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="365" {...field} value={field.value as number} />
                    </FormControl>
                    <FormDescription>Grace period before an invoice is overdue.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="selfCheckinEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel className="!mt-0">Allow member self check-in</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Streak requirements</p>
              <p className="text-xs text-muted-foreground">
                What a member must do each day to keep their streak alive.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="streakRequiresCheckin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="!mt-0">Check in</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="streakRequiresCheckout"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="!mt-0">Check out</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="streakRequiresWorkoutLog"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="!mt-0">Log workout</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
