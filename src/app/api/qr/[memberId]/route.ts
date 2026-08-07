import { requireGymScope } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { generateMemberQrSvg } from "@/lib/qr";

/** Serve a member's check-in QR as an SVG image. Members may only fetch their
 *  own; owner/reception may fetch any member in their gym. Cached for a day —
 *  the QR encodes the member id, which is stable. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { user, gymId } = await requireGymScope("MEMBER", "GYM_OWNER", "RECEPTIONIST");
  const { memberId } = await params;

  if (user.role === "MEMBER" && user.id !== memberId) {
    return new Response("Forbidden", { status: 403 });
  }

  const member = await db.user.findFirst({
    where: { id: memberId, gymId, role: "MEMBER", deletedAt: null },
    select: { id: true },
  });
  if (!member) {
    return new Response("Member not found", { status: 404 });
  }

  const svg = await generateMemberQrSvg(memberId);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
