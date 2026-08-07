import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInvitePreview } from "@/lib/actions/auth.actions";
import { GoogleInviteButton } from "./google-invite-button";
import { AcceptPasswordForm } from "./accept-password-form";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvitePreview(token);

  if (!invite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation not found</CardTitle>
          <CardDescription>
            This link is invalid, has expired, or was already used. Ask your gym owner to resend it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const roleLabel = invite.role === "TRAINER" ? "Trainer" : invite.role === "MEMBER" ? "Member" : "Receptionist";
  const canUseGoogle = invite.role === "TRAINER" || invite.role === "MEMBER";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {invite.gymName} on Kailon</CardTitle>
        <CardDescription>
          You’ve been invited as a <strong>{roleLabel}</strong> — {invite.email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptPasswordForm token={token} />

        {canUseGoogle && (
          <>
            <div className="my-4 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <GoogleInviteButton />
          </>
        )}
      </CardContent>
    </Card>
  );
}
