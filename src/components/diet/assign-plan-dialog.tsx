"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  assignPlanSchema,
  type AssignPlanInput,
  type AssignPlanFormInput,
} from "@/lib/validations/diet";
import { assignPlanAction } from "@/lib/actions/diet.actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AssignPlanDialog({
  members,
  templates,
}: {
  members: { id: string; name: string }[];
  templates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<AssignPlanFormInput, unknown, AssignPlanInput>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues: {
      memberId: members[0]?.id ?? "",
      templateId: templates[0]?.id ?? "",
      startDate: todayIso(),
    },
  });

  async function onSubmit(values: AssignPlanInput) {
    setLoading(true);
    const result = await assignPlanAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Diet plan assigned");
    setOpen(false);
    form.reset({ memberId: members[0]?.id ?? "", templateId: templates[0]?.id ?? "", startDate: todayIso() });
    router.refresh();
  }

  const disabled = members.length === 0 || templates.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={disabled}>
            <Plus className="h-4 w-4" />
            Assign plan
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign diet plan</DialogTitle>
          <DialogDescription>
            Copies the template&apos;s meals onto a new plan for this member. Any existing active plan is
            cancelled.
          </DialogDescription>
        </DialogHeader>
        {disabled ? (
          <p className="text-sm text-muted-foreground">
            {members.length === 0
              ? "No members available to assign to."
              : "Create a diet template first, then come back to assign it."}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
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
