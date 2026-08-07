"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validations/auth";
import { inviteStaffAction } from "@/lib/actions/auth.actions";

export function InviteStaffDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { name: "", email: "", role: "TRAINER" },
  });

  const role = form.watch("role");

  async function onSubmit(values: InviteStaffInput) {
    setLoading(true);
    const result = await inviteStaffAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation sent");
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="h-4 w-4" />
            Invite staff
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a trainer or receptionist</DialogTitle>
          <DialogDescription>They’ll get an email with a link to join your gym.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRAINER">Trainer</SelectItem>
                      <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {role === "TRAINER"
                      ? "Trainers sign in with Google."
                      : "Receptionists set a password on their first visit."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Arjun Mehta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="arjun@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
