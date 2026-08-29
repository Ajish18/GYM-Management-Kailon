// ─────────────────────────────────────────────────────────────────────────────
// Kailon — Demo seed
//
// Creates a single, richly populated demo gym ("Iron Peak Fitness") so the
// production app looks like a real, live gym for client demos. Everything is
// scoped to one gym (gymCode IRONPEAK). Re-running is safe: the script first
// deletes any prior data for that gym, then rebuilds it from scratch.
//
// Run:  npx tsx prisma/seed-demo.ts
//
// Demo login (all roles use the unified login form — Gym ID + email + password):
//   Gym ID:  IRONPEAK
//   Password: Demo@123
//   Owner:       owner@ironpeak.fit
//   Reception:   reception@ironpeak.fit
//   Trainer:     trainer.vikram@ironpeak.fit   / trainer.ananya@ironpeak.fit
//   Member:      aarav.mehta@example.com  (any of the 15 member emails below)
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient, CheckMethod, MessageType, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const GYM_CODE = "IRONPEAK";
const DEMO_PASSWORD = "Demo@123";
const TAX_RATE = 18; // % — Indian GST-style line item on invoices

// ── Date helpers (all seeding is anchored on UTC so the app's UTC day
//    boundaries on Vercel line up with what we insert) ───────────────────────
const DAY_MS = 86_400_000;
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
function utcDateAt(offsetDays: number): Date {
  const t = todayUTC();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + offsetDays));
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function utc(d: Date, hour: number, minute = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute));
}
function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number): Date {
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + n);
  return t;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
const monthKey = (d: Date) => d.toISOString().slice(0, 7);

// ── Roster ───────────────────────────────────────────────────────────────────
type DemoMember = {
  name: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  dob: string;
  joinDaysAgo: number;
  plan: "Starter" | "Growth" | "Pro";
  trainer?: "vikram" | "ananya";
  remainingDays: number; // days until membership ends (negative = already expired)
  scenario?: "expiring" | "dues" | "expired" | "new";
  note?: string;
};

const MEMBERS: DemoMember[] = [
  { name: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "+919810001001", gender: "MALE", dob: "1994-05-14", joinDaysAgo: 170, plan: "Growth", trainer: "vikram", remainingDays: 22, note: "Focus: strength + hypertrophy" },
  { name: "Diya Kapoor", email: "diya.kapoor@example.com", phone: "+919810001002", gender: "FEMALE", dob: "1998-02-23", joinDaysAgo: 95, plan: "Starter", trainer: "ananya", remainingDays: 18, note: "Post-natal fitness" },
  { name: "Rohit Verma", email: "rohit.verma@example.com", phone: "+919810001003", gender: "MALE", dob: "1992-11-03", joinDaysAgo: 40, plan: "Growth", trainer: "vikram", remainingDays: 12, note: "Weight-loss program" },
  { name: "Sneha Reddy", email: "sneha.reddy@example.com", phone: "+919810001004", gender: "FEMALE", dob: "1996-07-19", joinDaysAgo: 150, plan: "Starter", trainer: "ananya", remainingDays: 3, scenario: "expiring", note: "Renewal due in 3 days" },
  { name: "Karan Malhotra", email: "karan.malhotra@example.com", phone: "+919810001005", gender: "MALE", dob: "1990-01-27", joinDaysAgo: 70, plan: "Growth", trainer: "vikram", remainingDays: 25, note: "Muscle gain — eating in surplus" },
  { name: "Pooja Joshi", email: "pooja.joshi@example.com", phone: "+919810001006", gender: "FEMALE", dob: "1993-09-08", joinDaysAgo: 120, plan: "Growth", trainer: "ananya", remainingDays: 14, scenario: "dues", note: "₹2,948 outstanding on monthly fee" },
  { name: "Arjun Nair", email: "arjun.nair@example.com", phone: "+919810001007", gender: "MALE", dob: "1989-03-30", joinDaysAgo: 240, plan: "Growth", trainer: "vikram", remainingDays: 27, note: "Half-marathon prep — strength base" },
  { name: "Ishita Gupta", email: "ishita.gupta@example.com", phone: "+919810001008", gender: "FEMALE", dob: "2000-12-11", joinDaysAgo: 7, plan: "Starter", trainer: "ananya", remainingDays: 28, scenario: "new", note: "New member — onboarding this week" },
  { name: "Manish Kumar", email: "manish.kumar@example.com", phone: "+919810001009", gender: "MALE", dob: "1987-06-21", joinDaysAgo: 300, plan: "Pro", trainer: "vikram", remainingDays: 45, note: "Powerlifter — competing in Nov" },
  { name: "Riya Sharma", email: "riya.sharma@example.com", phone: "+919810001010", gender: "FEMALE", dob: "1999-04-02", joinDaysAgo: 21, plan: "Growth", trainer: "ananya", remainingDays: 20, note: "Toned & lean — hiit focus" },
  { name: "Aditya Rao", email: "aditya.rao@example.com", phone: "+919810001011", gender: "MALE", dob: "1991-08-15", joinDaysAgo: 200, plan: "Starter", remainingDays: -5, scenario: "expired", note: "Membership lapsed — needs follow-up" },
  { name: "Neha Patel", email: "neha.patel@example.com", phone: "+919810001012", gender: "FEMALE", dob: "1995-10-05", joinDaysAgo: 42, plan: "Starter", remainingDays: 16, note: "Came via referral — friend of Aarav" },
  { name: "Sameer Khan", email: "sameer.khan@example.com", phone: "+919810001013", gender: "MALE", dob: "1988-02-17", joinDaysAgo: 130, plan: "Growth", trainer: "vikram", remainingDays: 24, note: "Post-injury rehab — knee" },
  { name: "Tanvi Desai", email: "tanvi.desai@example.com", phone: "+919810001014", gender: "FEMALE", dob: "2001-07-09", joinDaysAgo: 15, plan: "Starter", trainer: "ananya", remainingDays: 26, note: "Beginner — 3 days a week" },
  { name: "Deepak Chawla", email: "deepak.chawla@example.com", phone: "+919810001015", gender: "MALE", dob: "1985-12-01", joinDaysAgo: 365, plan: "Pro", trainer: "vikram", remainingDays: 60, note: "Veteran member — best attendance record" },
];

// ── Attendance patterns (UTC hours = IST+5:30; e.g. 5:00 UTC ≈ 10:30 AM IST) ─
type Pattern = { daysPerWeek: number; hours: number[]; durationMin: number; historyDays: number };
const PATTERNS: Record<string, Pattern> = {
  daily:   { daysPerWeek: 6, hours: [5, 6, 4],    durationMin: 90, historyDays: 30 },
  strong:  { daysPerWeek: 5, hours: [5, 16, 6],   durationMin: 75, historyDays: 26 },
  regular: { daysPerWeek: 4, hours: [7, 17, 8],   durationMin: 60, historyDays: 22 },
  light:   { daysPerWeek: 3, hours: [6, 18],      durationMin: 55, historyDays: 18 },
  newbie:  { daysPerWeek: 4, hours: [6, 16, 7],   durationMin: 60, historyDays: 10 },
};
const memberPattern = (m: DemoMember): Pattern =>
  m.scenario === "new" ? PATTERNS.newbie : m.plan === "Pro" ? PATTERNS.daily : m.gender === "FEMALE" ? PATTERNS.regular : PATTERNS.strong;

// Rest days per weekday-set so attendance looks natural.
const REST_SETS = [new Set([0, 3]), new Set([0, 5]), new Set([2, 6]), new Set([0, 4]), new Set([1, 6])];

function genAttendance(memberIdx: number, pattern: Pattern): Date[] {
  const rest = REST_SETS[memberIdx % REST_SETS.length];
  const dates: Date[] = [];
  for (let i = 0; i < pattern.historyDays; i++) {
    const day = utcDateAt(-i);
    if (rest.has(day.getUTCDay())) continue;
    if (i % 14 === 7) continue; // occasional miss (holiday / sick day)
    const hour = pattern.hours[i % pattern.hours.length];
    const minute = (i * 11) % 60;
    dates.push(utc(day, hour, minute));
  }
  return dates;
}

function computeStreaks(dates: Date[]): { current: number; longest: number; currentMonth: number; lastCredit: Date } {
  const set = new Set(dates.map(dayKey));
  const all = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of all) {
    if (prev !== null) {
      const diff = Math.round((new Date(`${k}T00:00:00Z`).getTime() - new Date(`${prev}T00:00:00Z`).getTime()) / DAY_MS);
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    prev = k;
    if (run > longest) longest = run;
  }
  let current = 0;
  let guard = 0;
  while (guard < 400) {
    if (!set.has(dayKey(utcDateAt(-guard)))) break;
    current++;
    guard++;
  }
  const curMonth = monthKey(new Date());
  let currentMonth = 0;
  let mPrev: string | null = null;
  for (const k of all) {
    if (!k.startsWith(curMonth)) continue;
    if (mPrev !== null) {
      const diff = Math.round((new Date(`${k}T00:00:00Z`).getTime() - new Date(`${mPrev}T00:00:00Z`).getTime()) / DAY_MS);
      currentMonth = diff === 1 ? currentMonth + 1 : 1;
    } else currentMonth = 1;
    mPrev = k;
  }
  const lastKey = all[all.length - 1] ?? dayKey(todayUTC());
  return { current, longest, currentMonth, lastCredit: new Date(`${lastKey}T00:00:00Z`) };
}

// ── Global exercise library (gym-scoped to the demo gym) ─────────────────────
const EXERCISES: Array<[string, string, string]> = [
  ["Back Squat", "Legs", "Barbell"],
  ["Bench Press", "Chest", "Barbell"],
  ["Deadlift", "Back", "Barbell"],
  ["Overhead Press", "Shoulders", "Barbell"],
  ["Incline Dumbbell Press", "Chest", "Dumbbell"],
  ["Lat Pulldown", "Back", "Cable"],
  ["Barbell Row", "Back", "Barbell"],
  ["Seated Cable Row", "Back", "Cable"],
  ["Leg Press", "Legs", "Machine"],
  ["Leg Curl", "Legs", "Machine"],
  ["Leg Extension", "Legs", "Machine"],
  ["Calf Raise", "Legs", "Machine"],
  ["Lateral Raise", "Shoulders", "Dumbbell"],
  ["Face Pull", "Shoulders", "Cable"],
  ["Tricep Pushdown", "Arms", "Cable"],
  ["Bicep Curl", "Arms", "Dumbbell"],
  ["Cable Fly", "Chest", "Cable"],
  ["Plank", "Core", "Bodyweight"],
  ["Russian Twist", "Core", "Bodyweight"],
  ["Crunch", "Core", "Bodyweight"],
  ["Treadmill Run", "Cardio", "Cardio"],
  ["Cycling", "Cardio", "Cardio"],
];

// ── Workout template structure (day → exercises by library index) ────────────
const PPL_TEMPLATE: { name: string; days: Array<{ label: string; exercises: Array<[number, number, number, number]> }> } = {
  name: "Push • Pull • Legs",
  days: [
    {
      label: "Push",
      exercises: [
        [1, 4, 8, 60], // Bench Press 4x8
        [4, 3, 10, 60], // Overhead Press 3x10
        [4, 3, 12, 45], // Incline DB Press
        [13, 3, 15, 30], // Lateral Raise
        [14, 3, 12, 45], // Face Pull
        [15, 3, 12, 45], // Tricep Pushdown
      ],
    },
    {
      label: "Pull",
      exercises: [
        [6, 4, 10, 60], // Lat Pulldown
        [7, 4, 8, 60], // Barbell Row
        [8, 3, 12, 45], // Seated Cable Row
        [16, 3, 12, 45], // Bicep Curl
        [14, 3, 15, 30], // Face Pull
      ],
    },
    {
      label: "Legs",
      exercises: [
        [0, 5, 5, 120], // Back Squat 5x5
        [9, 3, 12, 60], // Leg Press
        [10, 3, 12, 45], // Leg Curl
        [11, 3, 15, 30], // Leg Extension
        [12, 4, 15, 30], // Calf Raise
      ],
    },
  ],
};

const HIIT_TEMPLATE: { name: string; days: Array<{ label: string; exercises: Array<[number, number, number, number]> }> } = {
  name: "HIIT & Core Blast",
  days: [
    {
      label: "Conditioning",
      exercises: [
        [20, 3, 0, 90], // Treadmill (interval)
        [21, 3, 0, 90], // Cycling (interval)
        [17, 4, 30, 30], // Plank
        [18, 4, 20, 30], // Russian Twist
        [19, 3, 25, 30], // Crunch
      ],
    },
  ],
};

async function main() {
  // ── Clean up any prior demo run for this gym ───────────────────────────────
  // Order matters: children referencing users (conversations, diet/workout
  // plans, invites via gym-cascade) must go before the gym, and the gym must
  // go before its owner/member users (Gym.ownerUserId → User FK). Deleting
  // the gym cascades its owned tables (settings, branches, plans, exercises,
  // templates, badges, categories, invites). Users are deleted last by ID.
  const existing = await db.gym.findUnique({ where: { gymCode: GYM_CODE } });
  if (existing) {
    const gid = existing.id;
    const priorUserIds = (await db.user.findMany({ where: { gymId: gid }, select: { id: true } })).map((u) => u.id);
    console.log(`Demo gym "${GYM_CODE}" exists — clearing and rebuilding…`);
    await db.message.deleteMany({ where: { gymId: gid } });
    await db.conversation.deleteMany({ where: { gymId: gid } });
    await db.notification.deleteMany({ where: { gymId: gid } });
    await db.notificationPreference.deleteMany({ where: { gymId: gid } });
    await db.payment.deleteMany({ where: { gymId: gid } });
    await db.invoice.deleteMany({ where: { gymId: gid } });
    await db.membershipFreeze.deleteMany({ where: { gymId: gid } });
    await db.memberMembership.deleteMany({ where: { gymId: gid } });
    await db.workoutLogSet.deleteMany({ where: { gymId: gid } });
    await db.workoutLog.deleteMany({ where: { gymId: gid } });
    await db.workoutPlan.deleteMany({ where: { gymId: gid } });
    // Template exercises/days reference the gym's Exercise rows via non-cascading
    // FKs, so they must go before the gym's cascade reaches the exercise table.
    await db.workoutTemplateExercise.deleteMany({ where: { gymId: gid } });
    await db.workoutTemplateDay.deleteMany({ where: { gymId: gid } });
    await db.personalRecord.deleteMany({ where: { gymId: gid } });
    await db.dietNote.deleteMany({ where: { gymId: gid } });
    await db.dietPlanMeal.deleteMany({ where: { gymId: gid } });
    await db.dietPlan.deleteMany({ where: { gymId: gid } });
    await db.waterIntakeLog.deleteMany({ where: { gymId: gid } });
    await db.supplementRecommendation.deleteMany({ where: { gymId: gid } });
    await db.bodyMeasurement.deleteMany({ where: { gymId: gid } });
    await db.progressPhoto.deleteMany({ where: { gymId: gid } });
    await db.memberBadge.deleteMany({ where: { gymId: gid } });
    await db.streakFreezeUsage.deleteMany({ where: { gymId: gid } });
    await db.vacationModePeriod.deleteMany({ where: { gymId: gid } });
    await db.memberStreak.deleteMany({ where: { gymId: gid } });
    await db.attendanceRecord.deleteMany({ where: { gymId: gid } });
    await db.expense.deleteMany({ where: { gymId: gid } });
    await db.trainerProfile.deleteMany({ where: { gymId: gid } });
    await db.memberProfile.deleteMany({ where: { gymId: gid } });
    await db.gymSubscription.deleteMany({ where: { gymId: gid } });
    await db.gym.delete({ where: { id: gid } }); // cascades settings/branches/plans/exercises/templates/badges/categories/invites
    if (priorUserIds.length > 0) {
      // Cascades accounts, sessions, password resets, login attempts.
      await db.user.deleteMany({ where: { id: { in: priorUserIds } } });
    }
    console.log("Cleared.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const today = todayUTC();

  // ── 1. Owner, staff, gym, settings, subscription ───────────────────────────
  const owner = await db.user.create({
    data: { role: "GYM_OWNER", name: "Rajesh Sharma", email: "owner@ironpeak.fit", phone: "+919810000001", passwordHash, status: "ACTIVE" },
  });
  const reception = await db.user.create({
    data: { role: "RECEPTIONIST", name: "Priya Nair", email: "reception@ironpeak.fit", phone: "+919810000002", passwordHash, status: "ACTIVE" },
  });
  const trainerVikram = await db.user.create({
    data: { role: "TRAINER", name: "Vikram Singh", email: "trainer.vikram@ironpeak.fit", phone: "+919810000003", passwordHash, status: "ACTIVE" },
  });
  const trainerAnanya = await db.user.create({
    data: { role: "TRAINER", name: "Ananya Iyer", email: "trainer.ananya@ironpeak.fit", phone: "+919810000004", passwordHash, status: "ACTIVE" },
  });

  const gym = await db.gym.create({
    data: {
      name: "Iron Peak Fitness",
      slug: "iron-peak-fitness",
      gymCode: GYM_CODE,
      ownerUserId: owner.id,
      brandColor: "#ef4444",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: "ACTIVE",
      address: { line1: "1st Floor, Lotus Plaza, Link Road", city: "Andheri West, Mumbai", state: "Maharashtra", pin: "400053" },
    },
  });
  const gid = gym.id;

  await db.user.update({ where: { id: owner.id }, data: { gymId: gid } });
  await db.user.update({ where: { id: reception.id }, data: { gymId: gid } });
  await db.user.update({ where: { id: trainerVikram.id }, data: { gymId: gid } });
  await db.user.update({ where: { id: trainerAnanya.id }, data: { gymId: gid } });

  await db.gymSettings.create({
    data: {
      gymId: gid,
      invoicePrefix: "INV",
      defaultTaxPercent: TAX_RATE,
      paymentDueInDays: 7,
      selfCheckinEnabled: true,
      streakFreezesPerMonth: 1,
    },
  });
  await db.branch.create({
    data: {
      gymId: gid,
      name: "Iron Peak — Andheri (Main)",
      isDefault: true,
      address: { line1: "1st Floor, Lotus Plaza, Link Road", city: "Andheri West, Mumbai", state: "Maharashtra", pin: "400053" },
    },
  });

  const growthPlan = await db.subscriptionPlan.upsert({
    where: { code: "growth" },
    update: {},
    create: { code: "growth", name: "Growth", priceMonthly: 2499, priceYearly: 24999, maxMembers: 600, maxTrainers: 10 },
  });
  await db.gymSubscription.create({
    data: {
      gymId: gid,
      planId: growthPlan.id,
      billingCycle: "MONTHLY",
      status: "ACTIVE",
      currentPeriodStart: addDays(today, -10),
      currentPeriodEnd: addDays(today, 20),
    },
  });

  await db.trainerProfile.create({
    data: {
      userId: trainerVikram.id,
      gymId: gid,
      specialization: ["Strength & Conditioning", "Powerlifting"],
      certifications: ["ACE-CPT", "Kettlebell L2"],
      yearsExperience: 9,
      maxMemberCapacity: 30,
      bio: "9 years coaching strength athletes from first-timers to competitive powerlifters.",
    },
  });
  await db.trainerProfile.create({
    data: {
      userId: trainerAnanya.id,
      gymId: gid,
      specialization: ["Functional Training", "Mobility & Yoga"],
      certifications: ["RYT-500", "Pre & Post Natal"],
      yearsExperience: 6,
      maxMemberCapacity: 25,
      bio: "Movement-first coach focused on sustainable, injury-free training for women.",
    },
  });

  // ── 2. Membership plans (INR) ──────────────────────────────────────────────
  const PLANS: Record<string, { price: number; days: number; trainer: boolean; desc: string }> = {
    Starter: { price: 1499, days: 30, trainer: false, desc: "Gym floor access + locker. Perfect to get started." },
    Growth: { price: 2499, days: 30, trainer: true, desc: "Everything in Starter + 1 personal training session / week." },
    Pro: { price: 7999, days: 90, trainer: true, desc: "Premium: unlimited PT, diet plan, quarterly body composition scan." },
  };
  const planIds: Record<string, string> = {};
  let sort = 1;
  for (const [name, p] of Object.entries(PLANS)) {
    const plan = await db.membershipPlan.create({
      data: { gymId: gid, name, durationDays: p.days, price: p.price, description: p.desc, includesTrainer: p.trainer, sortOrder: sort++ },
    });
    planIds[name] = plan.id;
  }

  // ── 3. Exercises + workout templates ──────────────────────────────────────
  const exerciseIds: string[] = [];
  for (const [name, muscleGroup, equipment] of EXERCISES) {
    const ex = await db.exercise.create({ data: { gymId: gid, name, muscleGroup, equipment, isActive: true } });
    exerciseIds.push(ex.id);
  }
  const ex = (i: number) => exerciseIds[i];

  async function createTemplate(t: { name: string; days: Array<{ label: string; exercises: Array<[number, number, number, number]> }> }, createdById: string) {
    const tmpl = await db.workoutTemplate.create({ data: { gymId: gid, name: t.name, createdById, isActive: true } });
    let dayOrder = 0;
    for (const d of t.days) {
      const day = await db.workoutTemplateDay.create({ data: { gymId: gid, templateId: tmpl.id, dayOrder: dayOrder++, label: d.label } });
      let s = 0;
      for (const [exerciseIdx, sets, reps, rest] of d.exercises) {
        await db.workoutTemplateExercise.create({
          data: {
            gymId: gid,
            templateDayId: day.id,
            exerciseId: ex(exerciseIdx),
            targetSets: sets,
            targetReps: reps,
            restSeconds: rest,
            sortOrder: s++,
          },
        });
      }
    }
    return tmpl;
  }
  const pplTemplate = await createTemplate(PPL_TEMPLATE, trainerVikram.id);
  const hiitTemplate = await createTemplate(HIIT_TEMPLATE, trainerAnanya.id);

  // ── 4. Members + profiles + memberships + invoices + payments ─────────────
  const memberUserIds: Record<string, string> = {};
  let invoiceSeq = 0;
  const nextInvoiceNumber = () => `INV-${String(++invoiceSeq).padStart(4, "0")}`;
  const invoiceTotals = (subtotal: number) => {
    const taxAmount = round2((subtotal * TAX_RATE) / 100);
    return { subtotal, taxAmount, total: round2(subtotal + taxAmount) };
  };

  const memberInfo: Record<string, { userId: string; membershipId: string; trainerId?: string; joinDate: Date }> = {};

  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const user = await db.user.create({
      data: {
        gymId: gid,
        role: "MEMBER",
        name: m.name,
        email: m.email,
        phone: m.phone,
        passwordHash,
        status: "ACTIVE",
      },
    });
    memberUserIds[m.email] = user.id;

    const joinDate = addDays(today, -m.joinDaysAgo);
    const trainerId = m.trainer === "ananya" ? trainerAnanya.id : m.trainer === "vikram" ? trainerVikram.id : undefined;
    await db.memberProfile.create({
      data: {
        userId: user.id,
        gymId: gid,
        dob: new Date(`${m.dob}T00:00:00Z`),
        gender: m.gender,
        joinDate: dateOnly(joinDate),
        leaderboardOptIn: true,
        unitPreference: "METRIC",
        assignedTrainerId: trainerId,
        healthNotes: m.note,
        emergencyContactName: "Family",
        emergencyContactPhone: "+919810009999",
      },
    });

    const plan = PLANS[m.plan];
    const membershipEnd = addDays(today, m.remainingDays);
    const membershipStart = addDays(membershipEnd, -plan.days);
    const membership = await db.memberMembership.create({
      data: {
        gymId: gid,
        memberId: user.id,
        planId: planIds[m.plan],
        startDate: dateOnly(membershipStart),
        endDate: dateOnly(membershipEnd),
        status: m.remainingDays > 0 ? "ACTIVE" : "EXPIRED",
        pricePaid: plan.price,
        createdById: owner.id,
      },
    });
    memberInfo[m.email] = { userId: user.id, membershipId: membership.id, trainerId, joinDate: dateOnly(joinDate) };

    // Signup invoice + payment (the money already collected)
    const issue = addDays(membershipStart, 1);
    const totals = invoiceTotals(plan.price);
    const inv = await db.invoice.create({
      data: {
        gymId: gid,
        memberId: user.id,
        invoiceNumber: nextInvoiceNumber(),
        relatedMembershipId: membership.id,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        status: "PAID",
        issuedAt: utc(issue, 11, 0),
        dueDate: dateOnly(addDays(issue, 7)),
      },
    });
    const methods = ["UPI", "CASH", "CARD"] as const;
    await db.payment.create({
      data: {
        gymId: gid,
        invoiceId: inv.id,
        memberId: user.id,
        amount: totals.total,
        method: methods[i % methods.length],
        referenceNote: `Membership — ${m.plan} plan`,
        collectedById: reception.id,
        paidAt: utc(issue, 11, 30),
      },
    });

    // Scenario-specific invoices
    if (m.scenario === "expiring") {
      const renewal = invoiceTotals(plan.price);
      await db.invoice.create({
        data: {
          gymId: gid,
          memberId: user.id,
          invoiceNumber: nextInvoiceNumber(),
          subtotal: renewal.subtotal,
          taxAmount: renewal.taxAmount,
          total: renewal.total,
          status: "UNPAID",
          issuedAt: utc(addDays(today, -4), 10, 0),
          dueDate: dateOnly(membershipEnd),
        },
      });
    } else if (m.scenario === "dues") {
      const due = invoiceTotals(plan.price);
      await db.invoice.create({
        data: {
          gymId: gid,
          memberId: user.id,
          invoiceNumber: nextInvoiceNumber(),
          subtotal: due.subtotal,
          taxAmount: due.taxAmount,
          total: due.total,
          status: "UNPAID",
          issuedAt: utc(addDays(today, -20), 10, 0),
          dueDate: dateOnly(addDays(today, -13)),
        },
      });
    } else if (m.scenario === "expired") {
      const renewal = invoiceTotals(plan.price);
      await db.invoice.create({
        data: {
          gymId: gid,
          memberId: user.id,
          invoiceNumber: nextInvoiceNumber(),
          subtotal: renewal.subtotal,
          taxAmount: renewal.taxAmount,
          total: renewal.total,
          status: "UNPAID",
          issuedAt: utc(addDays(today, -10), 10, 0),
          dueDate: dateOnly(addDays(today, -3)),
        },
      });
    }
  }

  await db.gymSettings.update({
    where: { gymId: gid },
    data: { invoiceNextSeq: invoiceSeq + 1 },
  });

  // ── 5. Attendance + streaks ───────────────────────────────────────────────
  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const userId = memberUserIds[m.email];
    const pattern = memberPattern(m);
    const dates = genAttendance(i, pattern);
    const streaks = computeStreaks(dates);

    let insertIdx = 0;
    for (const d of dates) {
      const isToday = dayKey(d) === dayKey(today);
      const method: CheckMethod = isToday ? "QR" : insertIdx % 3 === 0 ? "MANUAL" : "SELF";
      const checkOut = insertIdx % 5 === 0 ? null : new Date(d.getTime() + pattern.durationMin * 60_000);
      await db.attendanceRecord.create({
        data: {
          gymId: gid,
          memberId: userId,
          checkInAt: d,
          checkInMethod: method,
          checkInById: method === "MANUAL" ? reception.id : null,
          checkOutAt: checkOut,
          checkOutMethod: checkOut ? "SELF" : null,
          sessionDurationMinutes: checkOut ? pattern.durationMin : null,
        },
      });
      insertIdx++;
    }

    await db.memberStreak.create({
      data: {
        memberId: userId,
        gymId: gid,
        currentStreak: streaks.current,
        longestStreak: Math.max(streaks.longest, streaks.current),
        currentMonthStreak: streaks.currentMonth,
        lastCreditDate: streaks.lastCredit,
        streakFreezesRemaining: 1,
      },
    });
  }

  // ── 6. Badges + awards ────────────────────────────────────────────────────
  const badgeDefs: Array<[string, string, string]> = [
    ["FIRST_DAY", "First Day", "Checked in for the first time 🎉"],
    ["WEEK_WARRIOR", "Week Warrior", "7-day attendance streak"],
    ["IRON_STREAK", "Iron Streak", "30-day attendance streak"],
    ["EARLY_BIRD", "Early Bird", "5 early-morning sessions"],
    ["COMEBACK", "Comeback Kid", "Returned after a 2+ week break"],
  ];
  const badgeIds: string[] = [];
  for (const [code, name, desc] of badgeDefs) {
    const b = await db.badge.create({ data: { gymId: gid, code, name, description: desc, criteria: {} } });
    badgeIds.push(b.id);
  }
  // Award badges to members whose streak justifies them
  const award: Array<[string, string]> = [
    ["deepak.chawla@example.com", "IRON_STREAK"],
    ["deepak.chawla@example.com", "EARLY_BIRD"],
    ["arjun.nair@example.com", "IRON_STREAK"],
    ["karan.malhotra@example.com", "WEEK_WARRIOR"],
    ["manish.kumar@example.com", "WEEK_WARRIOR"],
    ["aarav.mehta@example.com", "WEEK_WARRIOR"],
    ["tanvi.desai@example.com", "FIRST_DAY"],
    ["ishita.gupta@example.com", "FIRST_DAY"],
    ["rohit.verma@example.com", "COMEBACK"],
  ];
  for (const [email, code] of award) {
    const badge = badgeDefs.findIndex(([c]) => c === code);
    if (badge >= 0) {
      await db.memberBadge.create({
        data: { gymId: gid, memberId: memberUserIds[email], badgeId: badgeIds[badge] },
      });
    }
  }

  // ── 7. Workout plans + logs + PRs ─────────────────────────────────────────
  const workoutMembers = ["aarav.mehta@example.com", "karan.malhotra@example.com", "manish.kumar@example.com", "sameer.khan@example.com", "deepak.chawla@example.com"];
  const workoutPlanIds: Record<string, string> = {};
  for (const email of workoutMembers) {
    const { userId, trainerId } = memberInfo[email];
    const plan = await db.workoutPlan.create({
      data: {
        gymId: gid,
        memberId: userId,
        templateId: pplTemplate.id,
        assignedById: trainerId ?? trainerVikram.id,
        startDate: dateOnly(addDays(today, -14)),
        status: "ACTIVE",
      },
    });
    workoutPlanIds[email] = plan.id;
  }
  // Riya gets the HIIT template
  {
    const { userId, trainerId } = memberInfo["riya.sharma@example.com"];
    const plan = await db.workoutPlan.create({
      data: {
        gymId: gid,
        memberId: userId,
        templateId: hiitTemplate.id,
        assignedById: trainerId ?? trainerAnanya.id,
        startDate: dateOnly(addDays(today, -10)),
        status: "ACTIVE",
      },
    });
    workoutPlanIds["riya.sharma@example.com"] = plan.id;
  }

  // Workout logs + sets (so workout history & member "today" pages look alive)
  const logMembers: Array<[string, number]> = [
    ["deepak.chawla@example.com", 4], // last 4 sessions
    ["karan.malhotra@example.com", 3],
    ["aarav.mehta@example.com", 2],
    ["manish.kumar@example.com", 3],
  ];
  for (const [email, sessions] of logMembers) {
    const userId = memberUserIds[email];
    const planId = workoutPlanIds[email];
    for (let s = 0; s < sessions; s++) {
      const logDate = addDays(today, -s * 2);
      const templateDay = PPL_TEMPLATE.days[(s + 1) % PPL_TEMPLATE.days.length];
      const log = await db.workoutLog.create({
        data: {
          gymId: gid,
          workoutPlanId: planId,
          memberId: userId,
          logDate: dateOnly(logDate),
          status: "COMPLETED",
          notes: s === 0 ? "Great session — felt strong, added 2.5 kg on last set." : null,
        },
      });
      let setNo = 0;
      for (const [exerciseIdx, sets, reps] of templateDay.exercises) {
        for (let k = 0; k < sets; k++) {
          const weight = Math.round((15 + ((exerciseIdx + k + setNo) % 12) * 7.5) * 10) / 10;
          await db.workoutLogSet.create({
            data: {
              gymId: gid,
              workoutLogId: log.id,
              exerciseId: ex(exerciseIdx),
              setNumber: ++setNo,
              actualReps: reps > 0 ? Math.max(5, reps - ((k * 7) % 3)) : 20,
              actualWeight: reps > 0 ? weight : null,
              isPr: s === 0 && k === sets - 1 && exerciseIdx === 0,
            },
          });
        }
      }
    }
  }

  // Personal records
  const prDefs: Array<[string, number, number, number]> = [
    ["manish.kumar@example.com", 1, 115, 5], // Bench 115x5
    ["manish.kumar@example.com", 0, 180, 3], // Squat 180x3
    ["deepak.chawla@example.com", 0, 150, 5], // Squat 150x5
    ["deepak.chawla@example.com", 2, 185, 5], // Deadlift 185x5
    ["aarav.mehta@example.com", 1, 90, 6], // Bench 90x6
    ["arjun.nair@example.com", 2, 140, 8], // Deadlift 140x8
  ];
  for (const [email, exerciseIdx, weight, reps] of prDefs) {
    await db.personalRecord.create({
      data: {
        gymId: gid,
        memberId: memberUserIds[email],
        exerciseId: ex(exerciseIdx),
        bestWeight: weight,
        bestRepsAtWeight: reps,
        achievedAt: dateOnly(addDays(today, -5)),
      },
    });
  }

  // ── 8. Diet templates + plans + water + measurements ──────────────────────
  const dietBulk = await db.dietTemplate.create({
    data: { gymId: gid, name: "Lean Bulk — 3000 kcal", description: "High-protein lean bulk for muscle gain.", createdById: trainerVikram.id, isActive: true },
  });
  const dietCut = await db.dietTemplate.create({
    data: { gymId: gid, name: "Fat Loss — 1800 kcal", description: "Calorie-controlled fat-loss plan.", createdById: trainerAnanya.id, isActive: true },
  });
  const bulkMeals: Array<[string, string, number, number, number, number]> = [
    ["Breakfast", "07:30", 650, 42, 80, 16],
    ["Mid-Morning", "10:30", 450, 30, 50, 12],
    ["Lunch", "13:30", 750, 45, 90, 22],
    ["Pre-Workout", "17:00", 350, 20, 45, 6],
    ["Dinner", "20:30", 800, 50, 85, 25],
  ];
  for (const [mealName, timeSlot, cal, p, c, f] of bulkMeals) {
    await db.dietTemplateMeal.create({
      data: { gymId: gid, templateId: dietBulk.id, mealName, timeSlot, calories: cal, proteinG: p, carbsG: c, fatG: f, sortOrder: cal > 500 ? 1 : 0 },
    });
  }
  const cutMeals: Array<[string, string, number, number, number, number]> = [
    ["Breakfast", "08:00", 350, 25, 40, 8],
    ["Lunch", "13:00", 450, 35, 45, 12],
    ["Evening Snack", "17:30", 200, 15, 20, 5],
    ["Dinner", "20:00", 500, 40, 40, 18],
  ];
  for (const [mealName, timeSlot, cal, p, c, f] of cutMeals) {
    await db.dietTemplateMeal.create({
      data: { gymId: gid, templateId: dietCut.id, mealName, timeSlot, calories: cal, proteinG: p, carbsG: c, fatG: f, sortOrder: cal > 400 ? 1 : 0 },
    });
  }

  const dietAssignments: Array<[string, string, string]> = [
    ["karan.malhotra@example.com", "Lean Bulk — 3000 kcal", "BULK"],
    ["arjun.nair@example.com", "Lean Bulk — 3000 kcal", "BULK"],
    ["rohit.verma@example.com", "Fat Loss — 1800 kcal", "CUT"],
    ["riya.sharma@example.com", "Fat Loss — 1800 kcal", "CUT"],
  ];
  for (const [email, tplName, mode] of dietAssignments) {
    const { userId, trainerId } = memberInfo[email];
    const template = tplName === "Lean Bulk — 3000 kcal" ? dietBulk : dietCut;
    const created = await db.dietPlan.create({
      data: {
        gymId: gid,
        memberId: userId,
        templateId: template.id,
        assignedById: trainerId ?? trainerVikram.id,
        startDate: dateOnly(addDays(today, -12)),
        status: "ACTIVE",
      },
    });
    const meals = mode === "BULK" ? bulkMeals : cutMeals;
    for (const [mealName, timeSlot, cal, p, c, f] of meals) {
      await db.dietPlanMeal.create({
        data: { gymId: gid, dietPlanId: created.id, mealName, timeSlot, calories: cal, proteinG: p, carbsG: c, fatG: f, sortOrder: 0 },
      });
    }
    await db.supplementRecommendation.create({
      data: {
        gymId: gid,
        memberId: userId,
        dietPlanId: created.id,
        name: mode === "BULK" ? "Whey Protein (2 scoops/day)" : "Omega-3 + Multivitamin",
        dosage: mode === "BULK" ? "2 scoops post-workout" : "1 with breakfast",
        timingNote: "Daily",
        recommendedById: trainerId ?? trainerVikram.id,
      },
    });
  }

  // Water intake for a couple members
  for (const email of ["aarav.mehta@example.com", "diya.kapoor@example.com"]) {
    for (let d = 0; d < 5; d++) {
      await db.waterIntakeLog.create({
        data: { gymId: gid, memberId: memberUserIds[email], logDate: dateOnly(addDays(today, -d)), amountMl: 2500 + (d % 3) * 500 },
      });
    }
  }

  // Body-measurement history (weight trend) for a few members
  const measureMembers: Array<[string, number, number, number]> = [
    ["rohit.verma@example.com", 96, 176, 31], // start weight
    ["riya.sharma@example.com", 74, 165, 27],
    ["sameer.khan@example.com", 88, 178, 28],
    ["aarav.mehta@example.com", 78, 180, 24],
  ];
  for (const [email, w, h, fat] of measureMembers) {
    for (let step = 0; step < 3; step++) {
      const kg = round2(w - step * 1.7);
      const bmi = round2(kg / ((h / 100) * (h / 100)));
      await db.bodyMeasurement.create({
        data: {
          gymId: gid,
          memberId: memberUserIds[email],
          measuredAt: dateOnly(addDays(today, -step * 30)),
          recordedById: trainerVikram.id,
          weightKg: kg,
          heightCm: h,
          bmi,
          bodyFatPercent: round2(fat - step * 1.2),
        },
      });
    }
  }

  // ── 9. Conversations + messages ───────────────────────────────────────────
  const convDefs: Array<[string, string, string]> = [
    ["trainer.vikram@ironpeak.fit", "aarav.mehta@example.com", "vikram"],
    ["trainer.ananya@ironpeak.fit", "diya.kapoor@example.com", "ananya"],
    ["trainer.vikram@ironpeak.fit", "sameer.khan@example.com", "vikram"],
  ];
  const convIdByEmail: Record<string, string> = {};
  for (const [trainerEmail, memberEmail] of convDefs) {
    const trainerId = trainerEmail === "trainer.vikram@ironpeak.fit" ? trainerVikram.id : trainerAnanya.id;
    const conv = await db.conversation.create({
      data: { gymId: gid, trainerId, memberId: memberUserIds[memberEmail] },
    });
    convIdByEmail[memberEmail] = conv.id;
  }
  const msgDefs: Array<[string, string, string, string, number]> = [
    ["aarav.mehta@example.com", "trainer.vikram@ironpeak.fit", "Hey Vikram, today's push day felt amazing — bench finally hit 90!", "TEXT", 3],
    ["trainer.vikram@ironpeak.fit", "aarav.mehta@example.com", "Killing it! Add 2.5kg next week and keep that form tight 🔥", "TEXT", 2],
    ["trainer.vikram@ironpeak.fit", "aarav.mehta@example.com", "Your squat program starts Monday — I've updated your plan.", "WORKOUT_NOTE", 1],
    ["diya.kapoor@example.com", "trainer.ananya@ironpeak.fit", "Can I switch tomorrow's session to evening?", "TEXT", 2],
    ["trainer.ananya@ironpeak.fit", "diya.kapoor@example.com", "Of course — see you at 6:30 PM 🙂", "TEXT", 0],
    ["sameer.khan@example.com", "trainer.vikram@ironpeak.fit", "Knee felt much better on the leg press today.", "TEXT", 1],
    ["trainer.vikram@ironpeak.fit", "sameer.khan@example.com", "Good progress. Keep it light on squats for one more week.", "TEXT", 0],
  ];
  for (const [msgIdx, [fromEmail, toEmail, body, type, readDaysAgo]] of msgDefs.entries()) {
    const senderId = memberUserIds[fromEmail] ?? (fromEmail === "trainer.vikram@ironpeak.fit" ? trainerVikram.id : trainerAnanya.id);
    const convKey = memberUserIds[toEmail] ? toEmail : fromEmail;
    const convId = convIdByEmail[convKey];
    if (!convId) continue;
    const createdAt = utc(addDays(today, -Math.max(1, readDaysAgo + 1)), 9 + (msgIdx % 4), 15);
    await db.message.create({
      data: {
        gymId: gid,
        conversationId: convId,
        senderId,
        type: type as MessageType,
        body,
        readAt: readDaysAgo === 0 ? null : createdAt,
        createdAt,
      },
    });
  }

  // ── 10. Notifications ─────────────────────────────────────────────────────
  const notifDefs: Array<[string, string, string, string, number]> = [
    // [recipient email, type, title, body, ageDays]
    ["aarav.mehta@example.com", "PAYMENT_SUCCESS", "Payment received", "₹2,948.82 — Growth plan (Jun). Thanks, Aarav! 💪", 1],
    ["aarav.mehta@example.com", "WORKOUT_REMINDER", "Today's workout", "Push day is waiting for you at Iron Peak.", 0],
    ["deepak.chawla@example.com", "STREAK_MILESTONE", "30-day streak! 🔥", "You've checked in 30 days straight. Absolute legend.", 0],
    ["arjun.nair@example.com", "STREAK_MILESTONE", "New longest streak", "21 days and counting, Arjun!", 1],
    ["sneha.reddy@example.com", "FEE_DUE", "Membership expiring soon", "Your membership ends in 3 days — renew now to keep your streak.", 0],
    ["pooja.joshi@example.com", "FEE_DUE", "Payment overdue", "₹2,948.82 overdue since 20 Jul. Pay before the weekend to avoid a hold.", 0],
    ["aditya.rao@example.com", "FEE_DUE", "Membership expired", "Your membership lapsed 5 days ago. We'd love to have you back!", 0],
    ["ishita.gupta@example.com", "BIRTHDAY", "Welcome, Ishita! 🎉", "Happy first week at Iron Peak Fitness.", 1],
    ["karan.malhotra@example.com", "WORKOUT_REMINDER", "Leg day today", "Squats at 5x5 — your program is loaded.", 0],
    ["rohit.verma@example.com", "GOAL_ACHIEVED", "-2 kg this month 🎯", "You're on track for your July target. Keep going!", 2],
    ["diya.kapoor@example.com", "ATTENDANCE_REMINDER", "See you today?", "3 sessions this week — one more and you hit your goal.", 0],
    ["tanvi.desai@example.com", "WORKOUT_REMINDER", "Beginner session", "Ananya has today's plan ready for you.", 0],
  ];
  for (const [email, type, title, body, ageDays] of notifDefs) {
    const userId = memberUserIds[email];
    if (!userId) continue;
    await db.notification.create({
      data: {
        gymId: gid,
        userId,
        type: type as NotificationType,
        title,
        body,
        createdAt: utc(addDays(today, -ageDays), 8, 0),
        relatedEntityType: type === "FEE_DUE" ? "Invoice" : null,
      },
    });
  }
  // Owner + reception summary notifications
  for (const [userId, type, title, body] of [
    [owner.id, "EXPIRY", "3 memberships expiring this week", "Sneha (3d), Rohit (12d), Neha (16d). Send renewal reminders.", ],
    [owner.id, "PAYMENT_SUCCESS", "₹8,994 collected yesterday", "7 payments across 7 members. UPI is your top channel.", ],
    [reception.id, "ATTENDANCE_REMINDER", "Morning rush done", "24 check-ins so far today. Great energy!", ],
  ] as Array<[string, string, string, string]>) {
    await db.notification.create({
      data: { gymId: gid, userId, type: type as NotificationType, title, body, createdAt: utc(today, 12, 30) },
    });
  }

  // ── 11. Expenses (for P&L) ────────────────────────────────────────────────
  const catDefs = ["Rent", "Salaries", "Equipment", "Utilities", "Maintenance", "Marketing"];
  const catIds: string[] = [];
  for (const name of catDefs) {
    const c = await db.expenseCategory.create({ data: { gymId: gid, name } });
    catIds.push(c.id);
  }
  const expDefs: Array<[string, number, number]> = [
    // [category name, daysAgo, amount]
    ["Rent", 2, 45000],
    ["Salaries", 3, 30000],
    ["Utilities", 5, 6800],
    ["Maintenance", 8, 4200],
    ["Marketing", 12, 3500],
    ["Equipment", 20, 24500],
    ["Rent", 32, 45000],
    ["Salaries", 33, 30000],
    ["Utilities", 35, 7100],
    ["Marketing", 40, 4200],
    ["Rent", 62, 45000],
    ["Salaries", 63, 30000],
  ];
  const catIndex = new Map(catDefs.map((c, i) => [c, i]));
  for (const [cat, daysAgo, amount] of expDefs) {
    await db.expense.create({
      data: {
        gymId: gid,
        categoryId: catIds[catIndex.get(cat)!],
        amount,
        expenseDate: dateOnly(addDays(today, -daysAgo)),
        vendorNote: `${cat} — ${new Date(addDays(today, -daysAgo)).toLocaleDateString("en-IN", { month: "short" })}`,
        recordedById: owner.id,
      },
    });
  }

  // ── 12. Wrap up ───────────────────────────────────────────────────────────
  const counts = {
    members: MEMBERS.length,
    trainers: 2,
    activeMemberships: MEMBERS.filter((m) => m.remainingDays > 0).length,
    invoices: invoiceSeq,
    attendanceToday: await db.attendanceRecord.count({ where: { gymId: gid, checkInAt: { gte: today } } }),
  };
  console.log("\n✅ Demo gym seeded:");
  console.log(`   Gym: Iron Peak Fitness  (Gym ID: ${GYM_CODE})`);
  console.log(`   Members: ${counts.members} · Active memberships: ${counts.activeMemberships} · Check-ins today: ${counts.attendanceToday}`);
  console.log(`   Invoices: ${counts.invoices} · Workout templates: 2 · Diet templates: 2 · Trainers: ${counts.trainers}`);
  console.log("\n🔑 Demo login (Gym ID: IRONPEAK, password: Demo@123):");
  console.log(`   Owner:       owner@ironpeak.fit`);
  console.log(`   Reception:   reception@ironpeak.fit`);
  console.log(`   Trainer:     trainer.vikram@ironpeak.fit`);
  console.log(`   Member:      aarav.mehta@example.com`);
  console.log(`   (Member with dues: pooja.joshi@example.com · Expiring: sneha.reddy@example.com)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
