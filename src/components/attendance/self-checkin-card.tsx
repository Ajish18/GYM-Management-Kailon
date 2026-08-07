import { db } from "@/lib/db";
import { getOpenSessionForMember, getLatestMembership } from "@/lib/data/attendance";
import { deriveMemberStatus } from "@/lib/member-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelfCheckinButton } from "@/components/attendance/self-checkin-button";

/** Member's self-service check-in/out card. Self-contained: given `gymId`
 *  and `memberId` it fetches its own membership-status and open-session
 *  state, so it can be dropped straight into the member dashboard. */
export async function SelfCheckinCard({ gymId, memberId }: { gymId: string; memberId: string }) {
  const [openSession, latestMembership, settings] = await Promise.all([
    getOpenSessionForMember(gymId, memberId),
    getLatestMembership(gymId, memberId),
    db.gymSettings.findUnique({ where: { gymId } }),
  ]);

  const status = deriveMemberStatus(latestMembership);
  const selfCheckinEnabled = settings?.selfCheckinEnabled ?? true;

  let blockedReason: string | null = null;
  if (status === "frozen") blockedReason = "Membership is frozen — unfreeze it to check in";
  else if (status === "expired") blockedReason = "Membership expired, renew to check in";
  else if (status === "inactive") blockedReason = "No membership on file — talk to the front desk";
  else if (!selfCheckinEnabled) blockedReason = "Self check-in is turned off here — ask the front desk to check you in";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{openSession ? "You're checked in" : "Check in"}</CardTitle>
        <CardDescription>
          {openSession
            ? `Since ${new Date(openSession.checkInAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : (blockedReason ?? "Tap in when you arrive at the gym")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SelfCheckinButton isCheckedIn={!!openSession} disabled={!openSession && !!blockedReason} />
      </CardContent>
    </Card>
  );
}
