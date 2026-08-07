"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
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
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  updateTrainerProfileSchema,
  type UpdateTrainerProfileInput,
} from "@/lib/validations/trainer";
import { updateTrainerProfileAction } from "@/lib/actions/trainer.actions";

type FormValues = {
  userId: string;
  specializationText: string;
  bio: string;
  yearsExperience: number | string;
  maxMemberCapacity: number | string;
};

export function TrainerProfileDialog({
  userId,
  name,
  initial,
}: {
  userId: string;
  name: string;
  initial: {
    specialization: string[];
    bio: string | null;
    yearsExperience: number | null;
    maxMemberCapacity: number | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    defaultValues: {
      userId,
      specializationText: initial.specialization.join(", "),
      bio: initial.bio ?? "",
      yearsExperience: initial.yearsExperience ?? "",
      maxMemberCapacity: initial.maxMemberCapacity ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const payload: UpdateTrainerProfileInput = {
      userId: values.userId,
      specialization: values.specializationText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bio: values.bio,
      yearsExperience: values.yearsExperience === "" ? undefined : Number(values.yearsExperience),
      maxMemberCapacity:
        values.maxMemberCapacity === "" ? undefined : Number(values.maxMemberCapacity),
    };
    const parsed = updateTrainerProfileSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const result = await updateTrainerProfileAction(parsed.data);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Trainer profile updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit profile
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}&apos;s trainer profile</DialogTitle>
          <DialogDescription>Specialization, bio, and capacity shown to members and staff.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="specializationText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialization</FormLabel>
                  <FormControl>
                    <Input placeholder="Strength training, Yoga, Nutrition" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Certifications, experience, coaching style" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="yearsExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of experience</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxMemberCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max member capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>Advisory only — a soft warning past this count.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
