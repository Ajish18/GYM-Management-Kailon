import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { getMemberPaymentSummary } from "@/lib/data/payments";
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
import { CheckCircle, Clock, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Payments" };

export default async function MemberPaymentsPage() {
  const { user, gymId } = await requireGymScope("MEMBER");

  const summary = await getMemberPaymentSummary(user.id, gymId);

  const unpaidInvoices = summary.invoices.filter(
    (inv) => inv.status !== "PAID"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments & Invoices</h1>
        <p className="text-muted-foreground">View your payment history and invoices</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalDue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(summary.outstanding)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unpaid">
        <TabsList>
          <TabsTrigger value="unpaid">
            Pending ({unpaidInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid" className="space-y-6">
          {unpaidInvoices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">
                  You have no pending invoices
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invoices</CardTitle>
                <CardDescription>
                  Invoices awaiting payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidInvoices.map((invoice) => {
                        const paid = invoice.payments.reduce(
                          (sum, p) => sum + Number(p.amount),
                          0
                        );
                        const isPaid = paid >= Number(invoice.total);
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(invoice.total))}
                            </TableCell>
                            <TableCell>{formatCurrency(paid)}</TableCell>
                            <TableCell>
                              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isPaid ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Paid
                                  </Badge>
                                ) : paid > 0 ? (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3" />
                                    Partial
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Unpaid</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Your recent payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments recorded yet
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.paidAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(Number(payment.amount))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{payment.method}</Badge>
                          </TableCell>
                          <TableCell>
                            {payment.invoice.status === "PAID" ? (
                              <Badge variant="default">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Partial
                              </Badge>
                            )}
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

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                Complete invoice history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.invoices.map((invoice) => {
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoiceNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(invoice.total))}
                            </TableCell>
                            <TableCell>
                              {new Date(invoice.issuedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  invoice.status === "PAID"
                                    ? "default"
                                    : invoice.status === "PARTIALLY_PAID"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                nativeButton={false}
                                render={
                                  <a
                                    href={`/api/invoices/${invoice.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                  />
                                }
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}