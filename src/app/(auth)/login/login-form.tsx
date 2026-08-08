"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
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
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "That Gym ID, email, or password isn't right.",
  GymNotFound: "No gym found with that ID.",
  TooManyAttempts: "Too many failed attempts on this account. Try again in 15 minutes.",
  TooManyAttemptsFromNetwork: "Too many failed attempts from this network. Try again shortly.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const urlError = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { gymCode: "", email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const result = await signIn("credentials", { ...values, redirect: false });
    setLoading(false);

    if (result?.error) {
      toast.error(ERROR_MESSAGES[result.error] ?? "Couldn't sign you in. Please try again.");
      return;
    }
    // Route through /role-redirect so the post-login target is validated
    // server-side against the caller's role (deep-links from the middleware's
    // ?next= are honored only when they belong to that role's area).
    window.location.href = next ? `/role-redirect?next=${encodeURIComponent(next)}` : "/role-redirect";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Gym owner or receptionist? Sign in here.</CardDescription>
      </CardHeader>
      <CardContent>
        {urlError && ERROR_MESSAGES[urlError] && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ERROR_MESSAGES[urlError]}
          </p>
        )}

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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Trainer or member?{" "}
          <Link href="/join" className="font-medium text-primary underline underline-offset-2">
            Join your gym
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
