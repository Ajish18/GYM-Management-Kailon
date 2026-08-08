"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, CreditCard, UserCog, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignMembershipDialog } from "@/components/memberships/assign-membership-dialog";
import { AssignTrainerDialog } from "@/components/members/assign-trainer-dialog";
import { deleteMemberAction } from "@/lib/actions/members.actions";
import type { MemberListItem, ActivePlan } from "@/lib/data/members";

export function MemberRowActions({
  member,
  plans,
  trainers,
  canDelete,
}: {
  member: MemberListItem;
  plans: ActivePlan[];
  trainers: { id: string; name: string }[];
  canDelete: boolean;
}) {
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [trainerOpen, setTrainerOpen] = useState(false);
  const router = useRouter();

  async function onDelete() {
    if (!confirm(`Remove ${member.name} from your gym? This can't be undone from here.`)) return;
    const result = await deleteMemberAction(member.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Member removed");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${member.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setMembershipOpen(true)}>
            <CreditCard className="h-4 w-4" />
            Assign / renew membership
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTrainerOpen(true)}>
            <UserCog className="h-4 w-4" />
            Assign trainer
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Remove member
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignMembershipDialog
        open={membershipOpen}
        onOpenChange={setMembershipOpen}
        memberId={member.id}
        memberName={member.name}
        plans={plans}
      />
      <AssignTrainerDialog
        open={trainerOpen}
        onOpenChange={setTrainerOpen}
        memberId={member.id}
        memberName={member.name}
        currentTrainerId={null}
        trainers={trainers}
      />
    </>
  );
}
