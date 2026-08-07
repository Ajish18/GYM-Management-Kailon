import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { listDietTemplates, listDietPlans, listMembersForDiet } from "@/lib/data/diet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TemplatesGrid } from "@/components/diet/templates-grid";
import { PlansTable } from "@/components/diet/plans-table";
import { AssignPlanDialog } from "@/components/diet/assign-plan-dialog";

export const metadata: Metadata = { title: "Diet Plans" };

export default async function OwnerDietPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");

  const [templates, plans, members] = await Promise.all([
    listDietTemplates(gymId),
    listDietPlans({ gymId }),
    listMembersForDiet(gymId),
  ]);
  const activeTemplates = templates.filter((t) => t.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diet plans</h1>
        <p className="text-muted-foreground">
          Build diet templates and assign them to any member across the gym.
        </p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <AssignPlanDialog members={members} templates={activeTemplates} />
          </div>
          <PlansTable plans={plans} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesGrid templates={templates} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
