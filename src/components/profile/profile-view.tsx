"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Camera, Loader2, Save, Shield, Building2, Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/settings";
import { updateProfileAction, uploadAvatarAction } from "@/lib/actions/profile.actions";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_LABELS: Record<string, string> = {
  GYM_OWNER: "Gym Owner",
  MEMBER: "Member",
  TRAINER: "Trainer",
  RECEPTIONIST: "Receptionist",
  PLATFORM_SUPER_ADMIN: "Platform Admin",
};

export type ProfileViewUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  hasPassword: boolean;
};

export type ProfileViewGym = {
  name: string;
  gymCode: string;
} | null;

export function ProfileView({
  user,
  gym,
}: {
  user: ProfileViewUser;
  gym: ProfileViewGym;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState(user.image);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onProfileSubmit(values: UpdateProfileInput) {
    const result = await updateProfileAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadAvatarAction(formData);
    setAvatarUploading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setCurrentImage(result.data.imageUrl);
    toast.success("Avatar updated");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your personal details and account settings.
        </p>
      </div>

      {/* Avatar + Identity Card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {currentImage && <AvatarImage src={currentImage} alt={user.name} />}
              <AvatarFallback className="text-2xl">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-colors hover:bg-secondary disabled:opacity-50"
              aria-label="Change avatar"
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            {user.email && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary">
                <Shield className="mr-1 h-3 w-3" />
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              {gym && (
                <Badge variant="outline">
                  <Building2 className="mr-1 h-3 w-3" />
                  {gym.name}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your name and phone number.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input value={user.email ?? "—"} disabled />
                <FormDescription>Email is set during registration and cannot be changed here.</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormDescription>Optional — used for notifications and account recovery.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your account information and membership status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
            </div>

            {gym && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gym</p>
                  <p className="text-sm text-muted-foreground">
                    {gym.name} <span className="font-mono text-xs">({gym.gymCode})</span>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Member since</p>
                <p className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Last login</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(user.lastLoginAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordForm hasPassword={user.hasPassword} />
    </div>
  );
}
