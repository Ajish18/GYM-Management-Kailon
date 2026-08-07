import type { Metadata } from "next";
import { Users, Dumbbell, MessageSquareText } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/guards";
import { getTrainerDashboardStats } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TrainerDashboardPage() {
  const user = await requireUser();
  const stats = await getTrainerDashboardStats(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your roster today</h1>
        <p className="text-muted-foreground">Members and plans you’re responsible for.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Assigned members" value={stats.assignedMembers} icon={Users} accent="primary" />
        <StatCard label="Active workout plans" value={stats.activeWorkoutPlans} icon={Dumbbell} accent="success" />
        <StatCard label="Unread messages" value={stats.unreadMessages} icon={MessageSquareText} accent="streak" />
      </div>
    </div>
  );
}
