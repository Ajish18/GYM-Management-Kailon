"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function MonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Input
      type="month"
      aria-label="Report month"
      className="w-full sm:w-48"
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("month", e.target.value);
        else params.delete("month");
        router.replace(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
