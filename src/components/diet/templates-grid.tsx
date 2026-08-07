import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateFormDialog } from "@/components/diet/template-form-dialog";
import { TemplateActiveToggle } from "@/components/diet/template-active-toggle";
import type { DietTemplateWithMeals } from "@/lib/data/diet";

export function TemplatesGrid({ templates }: { templates: DietTemplateWithMeals[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TemplateFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              New template
            </Button>
          }
        />
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No diet templates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a reusable meal plan — e.g. Lean bulk, Cutting, Maintenance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {template.meals.length} meal{template.meals.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <TemplateActiveToggle templateId={template.id} isActive={template.isActive} />
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                )}
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {template.meals.slice(0, 4).map((meal) => (
                    <li key={meal.id} className="flex justify-between gap-2">
                      <span className="truncate">{meal.mealName}</span>
                      <span>{meal.calories != null ? `${meal.calories} kcal` : ""}</span>
                    </li>
                  ))}
                  {template.meals.length > 4 && <li>+{template.meals.length - 4} more</li>}
                </ul>
                <TemplateFormDialog
                  template={template}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
