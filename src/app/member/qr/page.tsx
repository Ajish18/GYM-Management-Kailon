import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, ScanLine } from "lucide-react";

export const metadata: Metadata = { title: "My QR Code" };

export default async function MemberQrPage() {
  const { user, gymId } = await requireGymScope("MEMBER");
  const member = await db.user.findFirst({
    where: { id: user.id, gymId, role: "MEMBER" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in QR</h1>
        <p className="text-muted-foreground">
          {member ? `Show this code at the front desk to check in, ${member.name.split(" ")[0]}.` : "Show this code at the front desk to check in."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              {/* The QR encodes the member id and is served by /api/qr/[id]. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${member?.id ?? user.id}`}
                alt="Personal check-in QR code"
                width={256}
                height={256}
                className="h-64 w-64"
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Member ID: <span className="font-mono">{member?.id ?? user.id}</span>
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                How it works
              </CardTitle>
              <CardDescription>
                The front desk scans your QR on arrival to check you in — no need to say your name or phone number.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Good to know
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Your code only works at your own gym.</li>
                <li>You can still check in once per day — same rule as before.</li>
                <li>Expired or frozen memberships block check-in until renewed.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
