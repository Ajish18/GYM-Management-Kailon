import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import {
  listExercises,
  listActiveExercises,
  listTemplates,
  listActiveTemplates,
  listAssignableMembers,
  listWorkoutPlans,
} from "@/lib/data/workouts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExerciseLibrary } from "@/components/workouts/exercise-library";
import { TemplatesList } from "@/components/workouts/templates-list";
import { PlansPanel } from "@/components/workouts/plans-panel";

export const metadata: Metadata = { title: "Workouts" };

export default async function TrainerWorkoutsPage() {
  const { user, gymId } = await requireGymScope("TRAINER");

  const [exercises, activeExercises, templates, activeTemplates, members, plans] = await Promise.all([
    listExercises({ gymId }),
    listActiveExercises(gymId),
    listTemplates(gymId),
    listActiveTemplates(gymId),
    listAssignableMembers({ gymId, trainerId: user.id }),
    listWorkoutPlans({ gymId, trainerId: user.id }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <p className="text-muted-foreground">
          Exercise library, templates, and assigned plans for your members.
        </p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="pt-4">
          <PlansPanel plans={plans} members={members} templates={activeTemplates} />
        </TabsContent>
        <TabsContent value="templates" className="pt-4">
          <TemplatesList templates={templates} exercises={activeExercises} members={members} />
        </TabsContent>
        <TabsContent value="exercises" className="pt-4">
          <ExerciseLibrary exercises={exercises} />
        </TabsContent>
      </Tabs>
    </div>
  );
}