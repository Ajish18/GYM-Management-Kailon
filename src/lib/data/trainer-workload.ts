import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type TrainerWorkloadRow = {
  trainerId: string;
  name: string;
  image: string | null;
  assignedMembers: number;
  capacity: number | null;
  activeWorkoutPlans: number;
  activeDietPlans: number;
  todayCheckIns: number;
  /** assignedMembers ÷ capacity (0 when no capacity set) — drives the
   *  utilization bar on the owner workload page. */
  utilizationPercent: number | null;
};

/** Per-trainer load for the owner's Trainer Workload page: how many members
 *  each trainer is assigned, their active plan load, and how many of their
 *  members have checked in today. All groupBy/aggregates — no N+1.
 *  Cached 60s — a workload screen isn't live data, and sidebar visits to it
 *  previously re-ran ~6 queries against the remote DB. */
export const getTrainerWorkload = unstable_cache(
  async (gymId: string): Promise<TrainerWorkloadRow[]> => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const trainers = await db.user.findMany({
      where: { gymId, role: "TRAINER", deletedAt: null },
      select: {
        id: true,
        name: true,
        image: true,
        trainerProfile: { select: { maxMemberCapacity: true } },
      },
      orderBy: { name: "asc" },
    });

    const trainerIds = trainers.map((t) => t.id);
    if (trainerIds.length === 0) return [];

    const assigned = await db.memberProfile.findMany({
      where: { gymId, assignedTrainerId: { in: trainerIds } },
      select: { userId: true, assignedTrainerId: true },
    });

    // Member → trainer lookup + count per trainer
    const memberCountByTrainer = new Map<string, number>();
    const membersByTrainer = new Map<string, string[]>();
    for (const a of assigned) {
      const tid = a.assignedTrainerId!;
      memberCountByTrainer.set(tid, (memberCountByTrainer.get(tid) ?? 0) + 1);
      const list = membersByTrainer.get(tid) ?? [];
      list.push(a.userId);
      membersByTrainer.set(tid, list);
    }

    const [workoutAgg, dietAgg] = await Promise.all([
      db.workoutPlan.groupBy({
        by: ["assignedById"],
        where: { gymId, assignedById: { in: trainerIds }, status: "ACTIVE" },
        _count: true,
      }),
      db.dietPlan.groupBy({
        by: ["assignedById"],
        where: { gymId, assignedById: { in: trainerIds }, status: "ACTIVE" },
        _count: true,
      }),
    ]);

    const workoutByTrainer = new Map(workoutAgg.map((g) => [g.assignedById, g._count]));
    const dietByTrainer = new Map(dietAgg.map((g) => [g.assignedById, g._count]));

    // Today's check-ins across all assigned members, then bucket by trainer.
    const allMemberIds = assigned.map((a) => a.userId);
    const checkInCountByMember = new Map<string, number>();
    if (allMemberIds.length > 0) {
      const todayRecords = await db.attendanceRecord.findMany({
        where: { gymId, memberId: { in: allMemberIds }, checkInAt: { gte: todayStart } },
        select: { memberId: true },
      });
      for (const r of todayRecords) {
        checkInCountByMember.set(r.memberId, (checkInCountByMember.get(r.memberId) ?? 0) + 1);
      }
    }

    return trainers.map((t) => {
      const assignedIds = membersByTrainer.get(t.id) ?? [];
      const todayCheckIns = assignedIds.reduce((sum, id) => sum + (checkInCountByMember.get(id) ?? 0), 0);
      const assignedMembers = memberCountByTrainer.get(t.id) ?? 0;
      const capacity = t.trainerProfile?.maxMemberCapacity ?? null;

      return {
        trainerId: t.id,
        name: t.name,
        image: t.image,
        assignedMembers,
        capacity,
        activeWorkoutPlans: workoutByTrainer.get(t.id) ?? 0,
        activeDietPlans: dietByTrainer.get(t.id) ?? 0,
        todayCheckIns,
        utilizationPercent:
          capacity != null && capacity > 0 ? Math.min(100, Math.round((assignedMembers / capacity) * 100)) : null,
      };
    });
  },
  ["trainer-workload"],
  { revalidate: 60 },
);
