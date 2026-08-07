import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/guards";
import { getSignedUrl, uploadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** On-demand invoice PDF. The first download for an invoice is generated
 *  with pdf-lib's built-in Helvetica (WinAnsi-encoded, so amounts use the
 *  currency CODE — e.g. "INR 5,000.00" — rather than the ₹ glyph which the
 *  font can't encode) and then cached to Supabase storage; subsequent
 *  downloads redirect to a short-lived signed URL instead of re-rendering.
 *  All caching is best-effort — no storage config means regenerate each
 *  time, never a broken download. */
function money(currency: string, amount: number): string {
  return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["GYM_OWNER", "RECEPTIONIST", "MEMBER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // Members may only download their own invoices; staff anything in their gym.
  const where =
    user.role === "MEMBER"
      ? { id, memberId: user.id }
      : user.gymId
        ? { id, gymId: user.gymId }
        : { id: "none" };
  const invoice = await db.invoice.findFirst({ where });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Cached-PDF fast path: once generated, the PDF lives in Supabase storage
  // and this route just redirects to a short-lived signed URL — the browser
  // downloads straight from the CDN instead of our server re-generating (and
  // re-rendering) the whole A4 layout on every request. The redirect itself
  // is not cached because the signed URL expires.
  if (invoice.pdfStoragePath) {
    try {
      const signedUrl = await getSignedUrl(invoice.pdfStoragePath);
      return NextResponse.redirect(signedUrl, 302);
    } catch {
      // Signed-URL failure falls through to regeneration rather than 500.
    }
  }

  const [member, gym, payments, membership] = await Promise.all([
    db.user.findFirst({
      where: { id: invoice.memberId },
      select: { name: true, email: true, phone: true },
    }),
    db.gym.findUnique({
      where: { id: invoice.gymId },
      select: { name: true, address: true, currency: true },
    }),
    db.payment.findMany({
      where: { invoiceId: invoice.id, isReversal: false },
      orderBy: { paidAt: "asc" },
      select: { amount: true, method: true, paidAt: true, referenceNote: true },
    }),
    invoice.relatedMembershipId
      ? db.memberMembership.findFirst({
          where: { id: invoice.relatedMembershipId },
          select: { plan: { select: { name: true, durationDays: true } } },
        })
      : Promise.resolve(null),
  ]);

  const currency = gym?.currency ?? "INR";
  const total = Number(invoice.total);
  const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Math.max(0, total - paidAmount);
  const statusLabel = invoice.status === "PARTIALLY_PAID" ? "Partially paid" : invoice.status.toLowerCase();
  const address = (gym?.address as { line?: string; city?: string } | null) ?? {};
  const subtotal = Number(invoice.subtotal);
  const taxRate =
    subtotal > 0 && Number(invoice.taxAmount) > 0
      ? Math.round((Number(invoice.taxAmount) / subtotal) * 100)
      : null;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const muted = rgb(0.55, 0.55, 0.55);

  const right = width - 48;
  const divider = (y: number) =>
    page.drawLine({ start: { x: 48, y }, end: { x: right, y }, thickness: 0.75, color: muted });
  const rightAlign = (text: string, y: number, opts: { size: number; bold?: boolean; color?: typeof black }) => {
    const f = opts.bold ? bold : font;
    const w = f.widthOfTextAtSize(text, opts.size);
    page.drawText(text, { x: right - w, y, size: opts.size, font: f, color: opts.color ?? black });
  };

  // ── Header ─────────────────────────────────────────────────────────────
  let y = height - 56;
  page.drawText(gym?.name ?? "Gym", { x: 48, y, size: 18, font: bold, color: black });
  y -= 15;
  const addressLines = [address.line, address.city].filter(Boolean).join(", ");
  if (addressLines) {
    page.drawText(addressLines, { x: 48, y, size: 10, font, color: gray });
    y -= 13;
  }
  page.drawText(`Invoice ${invoice.invoiceNumber}`, { x: 48, y, size: 11, font: bold, color: black });
  y -= 13;
  page.drawText(
    `Issued: ${fmtDate(invoice.issuedAt)}   Due: ${fmtDate(invoice.dueDate)}   Status: ${statusLabel}`,
    { x: 48, y, size: 9, font, color: gray },
  );

  // ── Bill to ────────────────────────────────────────────────────────────
  y -= 40;
  page.drawText("BILLED TO", { x: 48, y, size: 9, font: bold, color: gray });
  y -= 14;
  page.drawText(member?.name ?? "Unknown", { x: 48, y, size: 12, font: bold, color: black });
  y -= 13;
  if (member?.email) {
    page.drawText(member.email, { x: 48, y, size: 9, font, color: gray });
    y -= 12;
  }
  if (member?.phone) {
    page.drawText(member.phone, { x: 48, y, size: 9, font, color: gray });
    y -= 12;
  }

  // ── Line item ──────────────────────────────────────────────────────────
  y -= 22;
  divider(y);
  y -= 12;
  page.drawText("DESCRIPTION", { x: 48, y, size: 8, font: bold, color: gray });
  rightAlign("AMOUNT", y, { size: 8, bold: true, color: gray });
  y -= 10;
  divider(y);
  y -= 22;
  page.drawText(membership?.plan.name ?? invoice.invoiceNumber, { x: 48, y, size: 11, font, color: black });
  if (membership) {
    page.drawText(`${membership.plan.durationDays} days`, { x: 48, y: y - 12, size: 9, font, color: gray });
  }
  rightAlign(money(currency, subtotal), y, { size: 11 });
  y -= 34;

  // ── Amounts ────────────────────────────────────────────────────────────
  const amounts: { label: string; value: string; bold?: boolean }[] = [
    { label: "Subtotal", value: money(currency, subtotal) },
    {
      label: `Discount${invoice.discountReason ? ` — ${invoice.discountReason}` : ""}`,
      value: `− ${money(currency, Number(invoice.discountAmount))}`,
    },
    { label: taxRate != null ? `Tax (${taxRate}%)` : "Tax", value: money(currency, Number(invoice.taxAmount)) },
    { label: "Total", value: money(currency, total), bold: true },
    { label: "Amount paid", value: `− ${money(currency, paidAmount)}` },
    { label: "Balance due", value: money(currency, balance), bold: true },
  ];
  for (const row of amounts) {
    y -= 16;
    page.drawText(row.label, { x: 48, y, size: 10, font: row.bold ? bold : font, color: black });
    rightAlign(row.value, y, { size: 10, bold: row.bold });
  }

  // ── Payment history ────────────────────────────────────────────────────
  if (payments.length > 0) {
    y -= 30;
    page.drawText("PAYMENTS", { x: 48, y, size: 9, font: bold, color: gray });
    y -= 12;
    page.drawText("DATE", { x: 48, y, size: 8, font: bold, color: gray });
    page.drawText("METHOD", { x: 200, y, size: 8, font: bold, color: gray });
    rightAlign("AMOUNT", y, { size: 8, bold: true, color: gray });
    y -= 10;
    divider(y);
    for (const p of payments) {
      y -= 18;
      page.drawText(fmtDate(p.paidAt), { x: 48, y, size: 9, font, color: black });
      page.drawText(p.method.replace("_", " "), { x: 200, y, size: 9, font, color: black });
      rightAlign(money(currency, Number(p.amount)), y, { size: 9 });
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  page.drawText("Generated by Kailon", { x: 48, y: 40, size: 8, font, color: muted });

  const bytes = await doc.save();

  // Best-effort cache write: persist the generated PDF to storage so the next
  // download hits the signed-URL fast path above. If storage isn't configured
  // (missing env vars) the download still works — we just regenerate.
  if (!invoice.pdfStoragePath) {
    try {
      const storagePath = `invoices/${invoice.id}.pdf`;
      await uploadFile(storagePath, Buffer.from(bytes), "application/pdf");
      await db.invoice.update({ where: { id: invoice.id }, data: { pdfStoragePath: storagePath } });
    } catch (err) {
      console.warn("[invoice-pdf] cache write skipped", err);
    }
  }

  const filename = `${invoice.invoiceNumber}.pdf`.replace(/[^\w.-]/g, "_");
  // Copy into a fresh Uint8Array<ArrayBuffer> — pdf-lib returns
  // Uint8Array<ArrayBufferLike>, which newer DOM libs reject as a BodyInit.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
