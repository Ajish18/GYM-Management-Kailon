import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { QrCheckinScanner } from "@/components/attendance/qr-checkin-scanner";

export const metadata: Metadata = { title: "QR Check-in" };

export default async function ReceptionQrCheckinPage() {
  await requireGymScope("GYM_OWNER", "RECEPTIONIST");

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
