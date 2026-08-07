import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import {
  getActiveDietPlanForMember,
  listSupplementsForMember,
  listDietNotesForPlan,
  getTodayWaterIntakeMl,
} from "@/lib/data/diet";
import { TodayDietCard } from "@/components/diet/today-diet-card";
import { WaterTracker } from "@/components/diet/water-tracker";
import { SupplementList } from "@/components/diet/supplement-list";
import { DietNotesList } from "@/components/diet/diet-notes-list";

export const metadata: Metadata = { title: "Diet" };

export default async function MemberDietPage() {
  const { user, gymId } = await requireGymScope("MEMBER");

  const [plan, supplements, todayTotalMl] = await Promise.all([
    getActiveDietPlanForMember(gymId, user.id),
    listSupplementsForMember(gymId, user.id),
    getTodayWaterIntakeMl(user.id),
  ]);
  const notes = plan ? await listDietNotesForPlan(plan.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diet</h1>
        <p className="text-muted-foreground">Your active plan, water intake, and supplement recommendations.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayDietCard plan={plan} />
        </div>
        <div className="space-y-6">
          <WaterTracker todayTotalMl={todayTotalMl} />
          <SupplementList supplements={supplements} />
          <DietNotesList notes={notes} />
        </div>
      </div>
    </div>
  );
}
