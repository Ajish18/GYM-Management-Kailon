"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Building2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleGlyph } from "@/components/google-glyph";
import { gymCodeSchema, loginSchema, selfSignupSchema, type LoginInput, type SelfSignupInput } from "@/lib/validations/auth";
import { findGymByCodeAction, selfSignupAction } from "@/lib/actions/auth.actions";
import { z } from "zod";

const gymCodeFormSchema = z.object({ gymCode: gymCodeSchema });
type GymCodeFormInput = z.infer<typeof gymCodeFormSchema>;

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "That email or password isn't right.",
  GymNotFound: "No gym found with that ID.",
  TooManyAttempts: "Too many failed attempts on this account. Try again in 15 minutes.",
  TooManyAttemptsFromNetwork: "Too many failed attempts from this network. Try again shortly.",
  NoAccount: "No account found for that Google email at this gym. Create an account first.",
  AccountDeactivated: "This account has been deactivated. Contact your gym owner.",
  PendingApproval: "Your trainer account is waiting for the gym owner to approve it.",
};

export function JoinGymFlow() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [gym, setGym] = useState<{ id: string; name: string; code: string } | null>(null);

  if (!gym) {
    return <GymCodeStep onFound={setGym} initialError={urlError} />;
  }

  return <AuthStep gym={gym} onChangeGym={() => setGym(null)} initialError={urlError} />;
}

function GymCodeStep({
  onFound,
  initialError,
}: {
  onFound: (gym: { id: string; name: string; code: string }) => void;
  initialError: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const form = useForm<GymCodeFormInput>({
    resolver: zodResolver(gymCodeFormSchema),
    defaultValues: { gymCode: "" },
  });

  async function onSubmit(values: GymCodeFormInput) {
    setLoading(true);
    const result = await findGymByCodeAction(values.gymCode);
    setLoading(false);
    if (!result.success) {
      form.setError("gymCode", { message: result.error });
      return;
    }
    onFound({ id: result.data.gymId, name: result.data.gymName, code: values.gymCode.toUpperCase() });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join your gym</CardTitle>
        <CardDescription>Enter the Gym ID your gym owner gave you to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        {initialError && ERROR_MESSAGES[initialError] && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ERROR_MESSAGES[initialError]}
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
                      className="text-center font-mono text-lg tracking-[0.3em] uppercase"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AuthStep({
  gym,
  onChangeGym,
  initialError,
}: {
  gym: { id: string; name: string; code: string };
  onChangeGym: () => void;
  initialError: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-1 inline-flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {gym.name}
          </span>
          <button type="button" onClick={onChangeGym} className="text-muted-foreground underline">
            change
          </button>
        </div>
        <CardTitle>Sign in or create your account</CardTitle>
      </CardHeader>
      <CardContent>
        {initialError && ERROR_MESSAGES[initialError] && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ERROR_MESSAGES[initialError]}
          </p>
        )}
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="create" className="flex-1">
              Create Account
            </TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-4">
            <SignInForm gymCode={gym.code} />
          </TabsContent>
          <TabsContent value="create" className="pt-4">
            <CreateAccountForm gymCode={gym.code} />
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>
        <GoogleButton />
      </CardContent>
    </Card>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl: "/" });
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph className="h-4 w-4" />}
      Continue with Google
    </Button>
  );
}

function SignInForm({ gymCode }: { gymCode: string }) {
  const [loading, setLoading] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { gymCode, email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const result = await signIn("credentials", { ...values, redirect: false });
    setLoading(false);
    if (result?.error) {
      toast.error(ERROR_MESSAGES[result.error] ?? "Couldn't sign you in. Please try again.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>
    </Form>
  );
}

function CreateAccountForm({ gymCode }: { gymCode: string }) {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const form = useForm<SelfSignupInput>({
    resolver: zodResolver(selfSignupSchema),
    defaultValues: {
      gymCode,
      role: "MEMBER",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SelfSignupInput) {
    setLoading(true);
    const result = await selfSignupAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data.pendingApproval) {
      setPending(true);
      return;
    }
    toast.success("You're in.");
    window.location.href = "/";
  }

  if (pending) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm">
        <p className="font-medium">Account created — waiting on approval</p>
        <p className="mt-1 text-muted-foreground">
          Your gym owner needs to approve your trainer account before you can sign in. Check back
          shortly, or ask them directly.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>I am a</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="TRAINER">Trainer</SelectItem>
                </SelectContent>
              </Select>
              {field.value === "TRAINER" && (
                <FormDescription>New trainer accounts need the gym owner’s approval.</FormDescription>
              )}
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
                <Input placeholder="Priya Sharma" {...field} />
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
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormDescription>Use the same email if you’d rather sign in with Google.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input placeholder="9876543210" {...field} />
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
          Create Account
        </Button>
      </form>
    </Form>
  );
}
