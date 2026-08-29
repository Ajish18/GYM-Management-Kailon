import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Image
        src="/logo.png"
        alt="Kailon logo"
        width={32}
        height={32}
        className="h-8 w-8"
        priority
      />
      {!iconOnly && <span className="text-lg">Kailon</span>}
    </span>
  );
}
