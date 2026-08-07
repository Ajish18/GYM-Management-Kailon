import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Dumbbell className="h-4.5 w-4.5" strokeWidth={2.5} />
      </span>
      {!iconOnly && <span className="text-lg">Kailon</span>}
    </span>
  );
}
