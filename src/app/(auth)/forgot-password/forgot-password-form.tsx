"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { requestPasswordResetAction } from "@/lib/actions/auth.actions";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { gymCode: "", email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    const result = await requestPasswordResetAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
            <MailCheck className="h-5 w-5" />
          </div>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            If an account exists for that email, we’ve sent a password reset link. It expires in
            one hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            nativeButton={false}
            render={<Link href="/login">Back to sign in</Link>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>Enter your Gym ID and the email you signed up with.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gymCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gym ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. K7F3XQ"
                      autoCapitalize="characters"
                      className="font-mono uppercase"
                      {...field}
                    />
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
                    <Input type="email" autoComplete="email" placeholder="you@yourgym.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
