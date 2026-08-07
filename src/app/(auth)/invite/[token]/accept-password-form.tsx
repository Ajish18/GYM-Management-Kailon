"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { acceptInvitePasswordSchema, type AcceptInvitePasswordInput } from "@/lib/validations/auth";
import { acceptInvitePasswordAction } from "@/lib/actions/auth.actions";

export function AcceptPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);

  const form = useForm<AcceptInvitePasswordInput>({
    resolver: zodResolver(acceptInvitePasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: AcceptInvitePasswordInput) {
    setLoading(true);
    const result = await acceptInvitePasswordAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("You're in.");
    window.location.href = "/";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Set a password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 10 characters, with upper, lower, and a number.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Set password & continue
        </Button>
      </form>
    </Form>
  );
}
