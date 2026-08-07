import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import {
  getActivePlanForMember,
  getTodayDayIndex,
  getTodayLogForPlan,
  getWorkoutHistory,
  getPersonalRecords,
} from "@/lib/data/workouts";
import { TodayWorkoutCard } from "@/components/workouts/today-workout-card";
import { WorkoutHistoryList } from "@/components/workouts/workout-history-list";
import { PersonalRecordsCard } from "@/components/workouts/personal-records-card";

export const metadata: Metadata = { title: "Workout" };

export default async function MemberWorkoutPage() {
  const { user, gymId } = await requireGymScope("MEMBER");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [plan, history, personalRecords] = await Promise.all([
    getActivePlanForMember(user.id),
    getWorkoutHistory(user.id, gymId, 20),
    getPersonalRecords(user.id, gymId),
  ]);

  let todayLog = null;
  let todayDayIndex = -1;

  if (plan) {
    const template = plan.template;
    if (template && template.days.length > 0) {
      todayDayIndex = getTodayDayIndex(plan.startDate, template.days.length);
      if (todayDayIndex >= 0) {
        todayLog = await getTodayLogForPlan(plan.id, user.id, today);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Workout</h1>
        <p className="text-muted-foreground">
          {plan
            ? `Day ${todayDayIndex + 1} of your ${plan.template?.name ?? "workout plan"}`
            : "No active workout plan assigned"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayWorkoutCard
            plan={plan}
            todayDayIndex={todayDayIndex}
            todayLog={todayLog}
            memberId={user.id}
          />
        </div>
        <div className="space-y-6">
          <PersonalRecordsCard records={personalRecords} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Workout history</h2>
        <WorkoutHistoryList history={history} />
      </div>
    </div>
  );
}