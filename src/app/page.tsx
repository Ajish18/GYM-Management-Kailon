import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  Activity,
  CalendarCheck,
  Dumbbell,
  Flame,
  LineChart,
  Mail,
  MessageSquareText,
  Salad,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Attendance & streaks",
    description: "Check-in to check-out, streak freezes, badges, and a leaderboard members actually want to climb.",
  },
  {
    icon: Dumbbell,
    title: "Workout programming",
    description: "Trainers build templates once, assign in seconds, and track every set, rep, and PR.",
  },
  {
    icon: Salad,
    title: "Diet & macros",
    description: "Meal plans, calories, protein/carbs/fat targets, and daily adherence notes.",
  },
  {
    icon: LineChart,
    title: "Progress tracking",
    description: "Measurements, body fat, transformation photos, and trend charts members love opening.",
  },
  {
    icon: Wallet,
    title: "Payments & dues",
    description: "Cash, UPI, card, or bank transfer — invoices, receipts, and pending dues, always in sync.",
  },
  {
    icon: MessageSquareText,
    title: "Trainer messaging",
    description: "A direct line between trainer and member — replacing scattered WhatsApp threads.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Ambient brand glow — no external images, zero load risk */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute top-96 -left-40 h-[28rem] w-[28rem] rounded-full bg-success/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login">Log in</Link>} />
          <Button nativeButton={false} render={<Link href="/register">Start free trial</Link>} />
        </nav>
      </header>

      <main>
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pt-16 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
            <Flame className="h-4 w-4 text-streak" />
            Built for gyms that want members to actually come back
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Run your gym like a{" "}
            <span className="bg-gradient-to-r from-primary to-streak bg-clip-text text-transparent">
              premium fitness brand
            </span>
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted-foreground">
            Kailon replaces the spreadsheet, the paper register, and the WhatsApp group with one app for
            memberships, attendance, workouts, diet, and payments — for owners, trainers, and members alike.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/register">Start your gym’s free trial</Link>} />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">I already have an account</Link>}
            />
          </div>

          <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Active gyms target", value: "500+" },
              { label: "Uptime SLA", value: "99.9%" },
              { label: "Modules", value: "20" },
              { label: "Setup time", value: "<10 min" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
                <div className="text-2xl font-semibold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Everything your gym runs on, in one place</h2>
            <p className="mt-3 text-muted-foreground">
              Twenty modules, one login per role, zero spreadsheets.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="flex flex-col items-center gap-6 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-success/10 p-12 text-center">
            <Activity className="h-8 w-8 text-primary" />
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight">
              Train. Track. Transform. Starting today.
            </h2>
            <Button size="lg" nativeButton={false} render={<Link href="/register">Create your gym’s account</Link>} />
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <Logo />
          <a
            href="mailto:kailongym@gmail.com"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4 text-primary" />
            Contact us: kailongym@gmail.com
          </a>
          <p>© {new Date().getFullYear()} Kailon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
