"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/settings";
import { changePasswordAction } from "@/lib/actions/settings.actions";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setLoading(true);
    const result = await changePasswordAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(hasPassword ? "Password updated" : "Password set");
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
        <CardDescription>
          {hasPassword
            ? "Other signed-in devices will be signed out after this."
            : "You currently sign in with Google only — add a password as a backup way in."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {hasPassword && (
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
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
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasPassword ? "Update password" : "Set password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
