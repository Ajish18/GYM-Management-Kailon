import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, Calendar, FileText, User } from "lucide-react";
import { requireGymScope } from "@/lib/auth/guards";
import { getInvoiceForCollection } from "@/lib/data/payments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { CollectPaymentForm } from "./collect-payment-form";

export const metadata: Metadata = { title: "Collect Payment" };

function statusBadge(status: string) {
  if (status === "PAID") return <Badge variant="default">Paid</Badge>;
  if (status === "PARTIALLY_PAID") return <Badge variant="secondary">Partially paid</Badge>;
  if (status === "VOID") return <Badge variant="outline">Void</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
}

export default async function CollectPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER", "RECEPTIONIST");
  const { id } = await params;
  const invoice = await getInvoiceForCollection(gymId, id);
  if (!invoice) notFound();

  const canCollect = invoice.status !== "VOID" && invoice.status !== "PAID" && invoice.remaining > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/reception/payments?tab=unpaid" />}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to payments
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Collect payment</h1>
        <p className="text-muted-foreground">Record a payment against this invoice.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {invoice.invoiceNumber}
            </CardTitle>
            <CardDescription>Issued {formatDate(invoice.issuedAt)}</CardDescription>
          </div>
          {statusBadge(invoice.status)}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{invoice.memberName}</div>
                {invoice.memberPhone && (
                  <div className="text-muted-foreground">{invoice.memberPhone}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Due {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}</div>
                {invoice.planName && <div className="text-muted-foreground">{invoice.planName}</div>}
              </div>
            </div>
          </div>

          <Separator />

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatCurrency(invoice.subtotal)}</dd>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="text-destructive">−{formatCurrency(invoice.discountAmount)}</dd>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatCurrency(invoice.taxAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <dt>Total</dt>
              <dd>{formatCurrency(invoice.total)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Already paid</dt>
              <dd>{formatCurrency(invoice.paidAmount)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <dt>Balance due</dt>
              <dd>{formatCurrency(invoice.remaining)}</dd>
            </div>
          </dl>

          {invoice.payments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">Payment history</h3>
                <ul className="space-y-1.5 text-sm">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-muted-foreground">
                      <span>
                        {formatDate(p.paidAt)} · {p.method.replace("_", " ")}
                      </span>
                      <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          {canCollect ? (
            <CollectPaymentForm invoiceId={invoice.id} remaining={invoice.remaining} total={invoice.total} />
          ) : (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {invoice.status === "VOID"
                ? "This invoice has been voided."
                : "This invoice is fully paid — nothing to collect."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
