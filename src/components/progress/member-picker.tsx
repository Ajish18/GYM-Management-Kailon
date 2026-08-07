"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignedMember } from "@/lib/data/progress";

/** Trainer-side member picker for /trainer/progress — navigates via the
 *  `memberId` search param so the page (a Server Component) re-fetches that
 *  member's data with the tenant/assignment checks already enforced there. */
export function MemberPicker({
  members,
  selectedId,
}: {
  members: AssignedMember[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedId}
      onValueChange={(value) => router.push(`/trainer/progress?memberId=${value}`)}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
