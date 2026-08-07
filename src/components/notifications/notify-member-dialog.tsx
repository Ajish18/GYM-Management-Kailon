"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyMemberSchema, type NotifyMemberInput } from "@/lib/validations/notifications";
import { notifyAssignedMemberAction } from "@/lib/actions/notifications.actions";

/** Targeted one-off notification from staff (trainer → assigned members,
 *  owner/reception → any member) to a single member. Renders a member
 *  dropdown + title + body and calls notifyAssignedMemberAction, which
 *  re-checks the role/assignment server-side and honors the member's
 *  TRAINER_MESSAGE opt-out. */
export function NotifyMemberDialog({
  members,
  triggerLabel = "Notify a member",
}: {
  members: { value: string; label: string }[];
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<NotifyMemberInput>({
    resolver: zodResolver(notifyMemberSchema),
    defaultValues: { memberId: "", title: "", body: "" },
  });

  async function onSubmit(values: NotifyMemberInput) {
    setLoading(true);
    const result = await notifyAssignedMemberAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Notification sent");
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" disabled={members.length === 0}>
            <Send className="h-4 w-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>
            Delivers a one-off notification to a single member. Members who have turned off
            trainer messages won&apos;t receive it.
          </DialogDescription>
        </DialogHeader>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.value} value={member.value}>
                          {member.label}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Reminder: technique check Thursday" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Let's review your form before leg day..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send notification
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
