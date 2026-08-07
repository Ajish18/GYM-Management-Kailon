"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { assignPlanSchema, type AssignPlanInput } from "@/lib/validations/workouts";
import { assignPlanAction } from "@/lib/actions/workouts.actions";

type Option = { id: string; name: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AssignPlanDialog({
  open,
  onOpenChange,
  members,
  templates,
  preselectedMemberId,
  preselectedTemplateId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Option[];
  templates: Option[];
  preselectedMemberId?: string;
  preselectedTemplateId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const defaultValues: AssignPlanInput = {
    memberId: preselectedMemberId ?? members[0]?.id ?? "",
    templateId: preselectedTemplateId ?? templates[0]?.id ?? "",
    startDate: todayISO(),
  };

  const form = useForm<AssignPlanInput>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        memberId: preselectedMemberId ?? members[0]?.id ?? "",
        templateId: preselectedTemplateId ?? templates[0]?.id ?? "",
        startDate: todayISO(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open]);

  async function onSubmit(values: AssignPlanInput) {
    setLoading(true);
    const result = await assignPlanAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Workout plan assigned");
    onOpenChange(false);
    router.refresh();
  }

  const disabled = members.length === 0 || templates.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign workout plan</DialogTitle>
          <DialogDescription>
            Assigning a new plan automatically cancels the member’s current active plan.
          </DialogDescription>
        </DialogHeader>
        {disabled ? (
          <p className="text-sm text-muted-foreground">
            {members.length === 0
              ? "No members available to assign."
              : "No active templates available — create one first."}
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!preselectedMemberId}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!preselectedTemplateId}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Assign plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
