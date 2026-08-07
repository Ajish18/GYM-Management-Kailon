"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MemberSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the debounced value changes
  }, [value]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by name, phone, or email"
        className="pl-9"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
