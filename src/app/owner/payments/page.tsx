import type { Metadata } from "next";
import Link from "next/link";
import { requireGymScope } from "@/lib/auth/guards";
import { listInvoices, listPayments } from "@/lib/data/payments";
import { getOwnerDashboardStats } from "@/lib/data/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ReversePaymentButton } from "@/components/payments/reverse-payment-button";

export const metadata: Metadata = { title: "Payments" };

function invoiceStatusBadge(status: string) {
  if (status === "PAID") return <Badge variant="default">Paid</Badge>;
  if (status === "PARTIALLY_PAID")
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" />
        Partial
      </Badge>
    );
  if (status === "VOID") return <Badge variant="outline">Void</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
}

export default async function OwnerPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { gymId } = await requireGymScope("GYM_OWNER");
  const params = await searchParams;
  const activeTab = params.tab === "payments" ? "payments" : "invoices";
  const page = Math.max(1, Number(params.page ?? 1));

  const [dashboard, invoices, payments] = await Promise.all([
    getOwnerDashboardStats(gymId),
    listInvoices({ gymId, page }),
    listPayments({ gymId, page }),
  ]);

  const invoicesHref = (p: number) => `?tab=invoices&page=${p}`;
  const paymentsHref = (p: number) => `?tab=payments&page=${p}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Revenue, pending dues, and full payment history</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue this month"
          value={formatCurrency(dashboard.monthRevenue)}
          icon={TrendingUp}
          accent="primary"
        />
        <StatCard
          label="Pending dues"
          value={dashboard.pendingDuesCount}
          hint={dashboard.pendingDuesAmount > 0 ? formatCurrency(dashboard.pendingDuesAmount) : undefined}
          icon={Wallet}
          accent="muted"
        />
        <StatCard
          label="Payments recorded"
          value={payments.total}
          icon={CheckCircle}
          accent="streak"
        />
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Every invoice in the gym, newest first</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No invoices yet</div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Due date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.items.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                            <TableCell>{inv.memberName}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(inv.total)}</TableCell>
                            <TableCell>{formatCurrency(inv.paidAmount)}</TableCell>
                            <TableCell>
                              {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  nativeButton={false}
                                  render={
                                    <a
                                      href={`/api/invoices/${inv.id}/pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                    />
                                  }
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  PDF
                                </Button>
                                {inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID" ? (
                                  <Button
                                    size="sm"
                                    nativeButton={false}
                                    render={
                                      <Link href={`/reception/payments/${inv.id}/collect`} />
                                    }
                                  >
                                    Collect
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {invoices.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={invoicesHref(invoices.page - 1)} />}
                        disabled={invoices.page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {invoices.page} of {invoices.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={invoicesHref(invoices.page + 1)} />}
                        disabled={invoices.page >= invoices.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All recorded payments, newest first</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No payments recorded yet</div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Invoice Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.items.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                            <TableCell>{payment.memberName}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.method.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{new Date(payment.paidAt).toLocaleDateString()}</div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(payment.paidAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{invoiceStatusBadge(payment.status)}</TableCell>
                            <TableCell className="text-right">
                              <ReversePaymentButton
                                paymentId={payment.id}
                                invoiceNumber={payment.invoiceNumber}
                                memberName={payment.memberName}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {payments.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={paymentsHref(payments.page - 1)} />}
                        disabled={payments.page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {payments.page} of {payments.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={paymentsHref(payments.page + 1)} />}
                        disabled={payments.page >= payments.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
