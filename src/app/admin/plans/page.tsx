import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  await requireRole("PLATFORM_SUPER_ADMIN");

  const plans = await db.subscriptionPlan.findMany({ orderBy: { priceMonthly: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscription plans</h1>
        <p className="text-muted-foreground">The billing tiers gyms can choose between.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{plans.length} {plans.length === 1 ? "plan" : "plans"}</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subscription plans defined yet — run `npm run db:seed` to load the catalog.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Yearly</TableHead>
                  <TableHead className="text-right">Max members</TableHead>
                  <TableHead className="text-right">Max trainers</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{plan.code}</TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-right">₹{Number(plan.priceMonthly).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{Number(plan.priceYearly).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{plan.maxMembers ?? "∞"}</TableCell>
                    <TableCell className="text-right">{plan.maxTrainers ?? "∞"}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
