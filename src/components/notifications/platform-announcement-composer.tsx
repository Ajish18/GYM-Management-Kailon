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
import { createPlatformAnnouncementAction } from "@/lib/actions/notifications.actions";

/** Platform-super-admin broadcast composer — same shape as the owner
 *  AnnouncementComposer, but creates a PlatformAnnouncement and notifies
 *  every active user across all gyms (not just one owner's gym). Only ever
 *  mounted on /admin/announcements; the underlying action re-checks the
 *  PLATFORM_SUPER_ADMIN role server-side. */
export function PlatformAnnouncementComposer() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateAnnouncementInput>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: { title: "", body: "" },
  });

  async function onSubmit(values: CreateAnnouncementInput) {
    setLoading(true);
    const result = await createPlatformAnnouncementAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Platform announcement sent to all gyms");
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
          <DialogTitle>Send a platform-wide announcement</DialogTitle>
          <DialogDescription>
            Every active member and staff member across every gym gets this as an in-app
            notification.
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
                    <Input placeholder="Scheduled maintenance this weekend" {...field} />
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
                    <Textarea placeholder="Kailon will be briefly offline for an upgrade..." {...field} />
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
