import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/members/status-badge";
import { MemberRowActions } from "@/components/members/member-row-actions";
import type { MemberListItem } from "@/lib/data/members";
import { formatDate } from "@/lib/format";

type Plan = { id: string; name: string; price: unknown; durationDays: number };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function MemberTable({
  members,
  plans,
  trainers,
  canDelete,
  hasQuery = false,
}: {
  members: MemberListItem[];
  plans: Plan[];
  trainers: { id: string; name: string }[];
  canDelete: boolean;
  /** True when a search/filter term is active, so the empty state can tell
   *  "no matches" apart from "no members yet". */
  hasQuery?: boolean;
}) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">{hasQuery ? "No matching members" : "No members yet"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasQuery
            ? "Try a different name, phone, or email."
            : "Register your first member to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Trainer</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {member.image && <AvatarImage src={member.image} alt={member.name} />}
                    <AvatarFallback>{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.phone ?? member.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <MemberStatusBadge status={member.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{member.planName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {member.expiresAt ? formatDate(member.expiresAt) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{member.trainerName ?? "Unassigned"}</TableCell>
              <TableCell>
                <MemberRowActions member={member} plans={plans} trainers={trainers} canDelete={canDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
