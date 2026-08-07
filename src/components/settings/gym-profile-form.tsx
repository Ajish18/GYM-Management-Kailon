"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateGymProfileSchema, type UpdateGymProfileInput } from "@/lib/validations/settings";
import { updateGymProfileAction } from "@/lib/actions/settings.actions";

export function GymProfileForm({
  initial,
}: {
  initial: {
    name: string;
    timezone: string;
    currency: string;
    brandColor: string;
    addressLine: string;
    city: string;
  };
}) {
  const [loading, setLoading] = useState(false);

  const form = useForm<UpdateGymProfileInput>({
    resolver: zodResolver(updateGymProfileSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: UpdateGymProfileInput) {
    setLoading(true);
    const result = await updateGymProfileAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Gym profile saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gym profile</CardTitle>
        <CardDescription>Name, location, timezone, currency, and brand color.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gym name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street, area" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input placeholder="Asia/Kolkata" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency code</FormLabel>
                    <FormControl>
                      <Input placeholder="INR" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brandColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand color</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="#4f46e5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
