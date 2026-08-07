import { Badge } from "@/components/ui/badge";
import { CategoryActiveToggle } from "@/components/expenses/category-active-toggle";
import { CreateCategoryDialog } from "@/components/expenses/create-category-dialog";
import type { ExpenseCategoryItem } from "@/lib/data/expenses";

export function CategoryManager({ categories }: { categories: ExpenseCategoryItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-medium">Expense categories</h2>
          <p className="text-sm text-muted-foreground">
            Default categories are shared across every gym and can&apos;t be turned off here — add
            your own to customize.
          </p>
        </div>
        <CreateCategoryDialog />
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first category — e.g. Rent, Electricity, Equipment.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <div className="divide-y">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.name}</span>
                  {category.isGlobal && <Badge variant="secondary">Default</Badge>}
                  {!category.isActive && <Badge variant="outline">Inactive</Badge>}
                </div>
                <CategoryActiveToggle
                  categoryId={category.id}
                  isActive={category.isActive}
                  disabled={category.isGlobal}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
