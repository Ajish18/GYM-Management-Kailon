import Image from "next/image";
import { cn } from "@/lib/utils";

/** Full "kailon" wordmark + dotted-dumbbell glyph, transparent background.
 *  Works on light and dark surfaces. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/kailon-logo.png"
      alt="Kailon"
      width={96}
      height={32}
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}
