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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerGymSchema, type RegisterGymInput } from "@/lib/validations/auth";
import { registerGymAction } from "@/lib/actions/auth.actions";
import { GymCodeCard } from "@/components/settings/gym-code-card";

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [createdGymCode, setCreatedGymCode] = useState<string | null>(null);

  const form = useForm<RegisterGymInput>({
    resolver: zodResolver(registerGymSchema),
    defaultValues: {
      gymName: "",
      ownerName: "",
      email: "",
      password: "",
      confirmPassword: "",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });

  async function onSubmit(values: RegisterGymInput) {
    setLoading(true);
    const result = await registerGymAction(values);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCreatedGymCode(result.data.gymCode);
  }

  if (createdGymCode) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Your gym is set up 🎉</CardTitle>
            <CardDescription>
              Save this Gym ID — trainers and members will need it to join, and your staff will
              need it to sign in too.
            </CardDescription>
          </CardHeader>
        </Card>
        <GymCodeCard gymCode={createdGymCode} gymName={form.getValues("gymName")} />
        <Button className="w-full" onClick={() => (window.location.href = "/owner")}>
          Continue to dashboard
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start your gym’s free trial</CardTitle>
        <CardDescription>You’ll be the owner account — you can invite trainers, receptionists, and members next.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gymName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gym name</FormLabel>
                  <FormControl>
                    <Input placeholder="Iron Temple Fitness" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
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
              Create my gym
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
