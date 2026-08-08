"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldX } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth.actions";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setLoading(true);
    const result = await resetPasswordAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldX className="h-5 w-5" />
          </div>
          <CardTitle>That link is incomplete</CardTitle>
          <CardDescription>
            The reset link needs its token. Use the link from your email, or request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" nativeButton={false} render={<Link href="/forgot-password">Request a new link</Link>} />
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Sign in with your new password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" nativeButton={false} render={<Link href="/login">Go to sign in</Link>} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a strong password you haven’t used before.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>
                    At least 10 characters, with upper, lower, and a number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
