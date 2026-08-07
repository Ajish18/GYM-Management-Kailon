import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { InviteStaffDialog } from "@/components/staff/invite-staff-dialog";
import { StaffApprovalActions } from "@/components/staff/staff-approval-actions";
import { TrainerProfileDialog } from "@/components/staff/trainer-profile-dialog";

export const metadata: Metadata = { title: "Staff" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function StaffPage() {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const staff = await db.user.findMany({
    where: { gymId, role: { in: ["TRAINER", "RECEPTIONIST"] }, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      passwordHash: true,
      trainerProfile: true,
      _count: { select: { membersAssigned: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Trainers and receptionists at your gym.</p>
        </div>
        <InviteStaffDialog />
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">No staff yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite a trainer or receptionist, or share your Gym ID so they can join themselves.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            // A trainer who self-signed-up via Join Gym already has a
            // password set (see selfSignupAction); one who's still waiting
            // to click an owner-sent invite link does not.
            const needsApproval =
              member.role === "TRAINER" && member.status === "INVITED" && !!member.passwordHash;

            return (
              <Card key={member.id}>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {member.image && <AvatarImage src={member.image} alt={member.name} />}
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline">{member.role === "TRAINER" ? "Trainer" : "Receptionist"}</Badge>
                      <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                        {needsApproval
                          ? "Awaiting approval"
                          : member.status === "INVITED"
                            ? "Invite pending"
                            : member.status === "ACTIVE"
                              ? "Active"
                              : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {needsApproval && <StaffApprovalActions userId={member.id} name={member.name} />}
                  {member.role === "TRAINER" && member.trainerProfile && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {member.trainerProfile.specialization.length > 0 ? (
                          member.trainerProfile.specialization.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No specialization set</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {member._count.membersAssigned} member
                          {member._count.membersAssigned === 1 ? "" : "s"} assigned
                          {member.trainerProfile.maxMemberCapacity
                            ? ` / ${member.trainerProfile.maxMemberCapacity} capacity`
                            : ""}
                        </span>
                        <TrainerProfileDialog
                          userId={member.id}
                          name={member.name}
                          initial={{
                            specialization: member.trainerProfile.specialization,
                            bio: member.trainerProfile.bio,
                            yearsExperience: member.trainerProfile.yearsExperience,
                            maxMemberCapacity: member.trainerProfile.maxMemberCapacity,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
