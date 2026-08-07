"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";
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
import { createAnnouncementSchema, type CreateAnnouncementInput } from "@/lib/validations/notifications";
import { createAnnouncementAction } from "@/lib/actions/notifications.actions";

/**
 * Owner-only gym-wide announcement composer — self-contained dialog + form,
 * not wired into any page. Suggested drop-in spot: the owner dashboard
 * (a "New announcement" button near the top) or the owner settings page,
 * next to gym profile settings. Renders nothing itself if the calling page
 * doesn't gate it to GYM_OWNER — the underlying action re-checks the role
 * server-side regardless, so the worst case of mis-placement is a hidden
 * dialog trigger for non-owners, not a security hole.
 */
export function AnnouncementComposer() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateAnnouncementInput>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: { title: "", body: "" },
  });

  async function onSubmit(values: CreateAnnouncementInput) {
    setLoading(true);
    const result = await createAnnouncementAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Announcement sent");
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Megaphone className="h-4 w-4" />
            New announcement
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a gym-wide announcement</DialogTitle>
          <DialogDescription>
            Every active staff member and member in your gym gets this as an in-app notification.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Gym closed this Sunday" {...field} />
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
                    <Textarea placeholder="We'll be closed for maintenance..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send announcement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
