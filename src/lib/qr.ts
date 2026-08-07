import QRCode from "qrcode";

/** The QR payload for a member is simply their (gym-scoped) user id. The
 *  reception scanner resolves it back to a member within the same gym, so a
 *  QR from another gym can never check someone in here. */
export function memberQrPayload(memberId: string) {
  return memberId;
}

/** Render a member's check-in QR as an SVG string. Generated server-side (no
 *  canvas needed), so it can be served straight from an API route. */
export async function generateMemberQrSvg(memberId: string): Promise<string> {
  return QRCode.toString(memberQrPayload(memberId), {
    type: "svg",
    margin: 1,
    width: 280,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });
}
