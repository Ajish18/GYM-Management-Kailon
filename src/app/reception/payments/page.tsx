import type { Metadata } from "next";
import Link from "next/link";
import { requireGymScope } from "@/lib/auth/guards";
import { listPayments, listUnpaidInvoices, getRecentPayments } from "@/lib/data/payments";
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
import { CheckCircle, Clock, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Payments" };

export default async function ReceptionPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { gymId } = await requireGymScope("RECEPTIONIST");
  const params = await searchParams;
  const activeTab = params.tab ?? "recent";
  const page = Number(params.page ?? 1);

  const [recentPayments, allPayments, unpaidInvoices] = await Promise.all([
    getRecentPayments(gymId, 10),
    listPayments({ gymId, page }),
    listUnpaidInvoices(gymId),
  ]);

  const paymentHref = (newPage: number) => `?tab=payments&page=${newPage}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Process payments and view payment history</p>
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Invoices ({unpaidInvoices.length})</TabsTrigger>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest 10 payments received today</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments recorded yet today
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.invoice.member?.user.name}</div>
                              {payment.invoice.member?.user.phone && (
                                <div className="text-sm text-muted-foreground">
                                  {payment.invoice.member.user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(Number(payment.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payment.method}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(payment.paidAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Invoices</CardTitle>
              <CardDescription>
                Invoices awaiting payment — sorted by due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">No unpaid invoices</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.memberName}</div>
                              {invoice.memberPhone && (
                                <div className="text-sm text-muted-foreground">
                                  {invoice.memberPhone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {invoice.paidAmount >= invoice.total ? (
                              <Badge variant="default">Paid</Badge>
                            ) : invoice.paidAmount > 0 ? (
                              <Badge variant="secondary">
                                <Clock className="mr-1 h-3 w-3" />
                                Partial
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unpaid</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/reception/payments/${invoice.id}/collect`}>
                              <Button size="sm" variant="default">
                                Collect
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All recorded payments</CardDescription>
            </CardHeader>
            <CardContent>
              {allPayments.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments recorded yet
                </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPayments.items.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {payment.invoiceNumber}
                            </TableCell>
                            <TableCell>{payment.memberName}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{payment.method}</Badge>
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
                            <TableCell>
                              <Badge
                                variant={
                                  payment.status === "PAID"
                                    ? "default"
                                    : payment.status === "PARTIALLY_PAID"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {allPayments.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Link href={paymentHref(allPayments.page - 1)}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={allPayments.page <= 1}
                        >
                          Previous
                        </Button>
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        Page {allPayments.page} of {allPayments.totalPages}
                      </span>
                      <Link href={paymentHref(allPayments.page + 1)}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={allPayments.page >= allPayments.totalPages}
                        >
                          Next
                        </Button>
                      </Link>
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