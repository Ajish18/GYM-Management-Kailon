import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { QrCheckinScanner } from "@/components/attendance/qr-checkin-scanner";

export const metadata: Metadata = { title: "QR Check-in" };

/** Owner-side QR check-in — same scanner as reception, so the owner can
 *  scan member QRs directly instead of only via a receptionist login.
 *  The server actions behind it (qrCheckInAction / qrCheckOutAction) already
 *  accept GYM_OWNER, so no new logic is needed here. */
export default async function OwnerQrCheckinPage() {
  await requireGymScope("GYM_OWNER");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QR Check-in</h1>
        <p className="text-muted-foreground">
          Scan a member&apos;s QR code to check them in or out — the quickest way to move the queue.
        </p>
      </div>
      <QrCheckinScanner />
    </div>
  );
}
