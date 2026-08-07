import type { Metadata } from "next";
import { Users, AlertCircle, Cake } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Today" };

export default async function ReceptionTodayPage() {
  const { gymId } = await requireGymScope("RECEPTIONIST");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const in1Day = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [checkInsToday, expiringToday, profilesWithDob] = await Promise.all([
    db.attendanceRecord.count({ where: { gymId, checkInAt: { gte: todayStart } } }),
    db.memberMembership.count({
      where: { gymId, status: "ACTIVE", endDate: { gte: todayStart, lte: in1Day } },
    }),
    db.memberProfile.findMany({
      where: { gymId, dob: { not: null } },
      select: { dob: true },
    }),
  ]);

  // Matches the birthday logic in the notification cron (docs/12 §12.16).
  const now = new Date();
  const birthdaysToday = profilesWithDob.filter(
    (p) => p.dob!.getMonth() === now.getMonth() && p.dob!.getDate() === now.getDate(),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Front desk</h1>
        <p className="text-muted-foreground">What’s happening at the gym today.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Check-ins today" value={checkInsToday} icon={Users} accent="primary" />
        <StatCard label="Expiring today" value={expiringToday} icon={AlertCircle} accent="muted" />
        <StatCard label="Birthdays today" value={birthdaysToday} icon={Cake} accent="streak" />
      </div>
    </div>
  );
}
