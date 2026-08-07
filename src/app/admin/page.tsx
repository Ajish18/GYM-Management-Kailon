import type { Metadata } from "next";
import { Building2, TrendingUp, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Platform Dashboard" };

export default async function AdminDashboardPage() {
  await requireRole("PLATFORM_SUPER_ADMIN");

  const [totalGyms, activeGyms, suspendedGyms] = await Promise.all([
    db.gym.count(),
    db.gym.count({ where: { status: "ACTIVE" } }),
    db.gym.count({ where: { status: "SUSPENDED" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
        <p className="text-muted-foreground">Every gym running on Kailon, at a glance.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total gyms" value={totalGyms} icon={Building2} accent="primary" />
        <StatCard label="Active gyms" value={activeGyms} icon={TrendingUp} accent="success" />
        <StatCard label="Suspended" value={suspendedGyms} icon={AlertTriangle} accent="muted" />
      </div>
    </div>
  );
}
