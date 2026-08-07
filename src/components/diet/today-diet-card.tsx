import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { getActiveDietPlanForMember } from "@/lib/data/diet";

type ActivePlan = NonNullable<Awaited<ReturnType<typeof getActiveDietPlanForMember>>>;
type PlanMeal = ActivePlan["meals"][number];

// No rigid enum exists for meal groupings on DietPlanMeal (free-text
// mealName/timeSlot) — infer a sensible bucket from the meal name first,
// falling back to the hour parsed out of the time slot, so odd names like
// "Pre-workout shake" still land somewhere reasonable.
const GROUP_ORDER = ["Breakfast", "Lunch", "Snacks", "Dinner", "Other"] as const;
type Group = (typeof GROUP_ORDER)[number];

function groupFor(meal: PlanMeal): Group {
  const name = meal.mealName.toLowerCase();
  if (/breakfast|morning/.test(name)) return "Breakfast";
  if (/lunch|midday/.test(name)) return "Lunch";
  if (/dinner|supper|evening meal/.test(name)) return "Dinner";
  if (/snack|shake|pre.?workout|post.?workout|smoothie/.test(name)) return "Snacks";

  const hourMatch = meal.timeSlot?.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)?/i);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1], 10);
    const meridiem = hourMatch[2]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (hour >= 5 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 15) return "Lunch";
    if (hour >= 15 && hour < 18) return "Snacks";
    if (hour >= 18 && hour < 23) return "Dinner";
  }
  return "Other";
}

function macroNumber(value: unknown) {
  return value != null ? Number(value) : null;
}

export function TodayDietCard({ plan }: { plan: ActivePlan | null }) {
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s diet</CardTitle>
          <CardDescription>No active diet plan yet — ask your trainer to assign one.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const grouped = new Map<Group, PlanMeal[]>();
  for (const meal of plan.meals) {
    const group = groupFor(meal);
    grouped.set(group, [...(grouped.get(group) ?? []), meal]);
  }

  const totalCalories = plan.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today&apos;s diet</CardTitle>
          <Badge variant="outline">{plan.template?.name ?? "Custom plan"}</Badge>
        </div>
        <CardDescription>
          {plan.meals.length} meal{plan.meals.length === 1 ? "" : "s"}
          {totalCalories > 0 ? ` · ~${totalCalories} kcal/day` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => (
          <div key={group} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">{group}</h4>
            <div className="space-y-2">
              {grouped.get(group)!.map((meal) => (
                <div key={meal.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{meal.mealName}</p>
                    {meal.timeSlot && <span className="text-xs text-muted-foreground">{meal.timeSlot}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meal.calories != null ? `${meal.calories} kcal` : "— kcal"} · P{" "}
                    {macroNumber(meal.proteinG) ?? "—"}g · C {macroNumber(meal.carbsG) ?? "—"}g · F{" "}
                    {macroNumber(meal.fatG) ?? "—"}g
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
