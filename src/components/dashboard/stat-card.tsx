import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent?: "primary" | "success" | "streak" | "muted";
}) {
  const accentClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    streak: "bg-streak/10 text-streak",
    muted: "bg-muted text-muted-foreground",
  }[accent];

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
