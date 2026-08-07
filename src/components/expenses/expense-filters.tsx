"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseCategoryItem } from "@/lib/data/expenses";

const ALL_CATEGORIES = "__all__";

export function ExpenseFilters({ categories }: { categories: ExpenseCategoryItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  useEffect(() => {
    const handle = setTimeout(() => updateParam("q", search || null), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the debounced value changes
  }, [search]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by vendor / note"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select
        value={searchParams.get("categoryId") ?? ALL_CATEGORIES}
        onValueChange={(value) => updateParam("categoryId", value === ALL_CATEGORIES ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="From date"
        className="w-full sm:w-auto"
        value={searchParams.get("dateFrom") ?? ""}
        onChange={(e) => updateParam("dateFrom", e.target.value || null)}
      />
      <Input
        type="date"
        aria-label="To date"
        className="w-full sm:w-auto"
        value={searchParams.get("dateTo") ?? ""}
        onChange={(e) => updateParam("dateTo", e.target.value || null)}
      />
    </div>
  );
}
