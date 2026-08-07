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
import { formatDate } from "@/lib/format";
import type { GymStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Gyms" };

const STATUS_STYLE: Record<GymStatus, "default" | "outline" | "destructive" | "secondary"> = {
  ACTIVE: "default",
  TRIAL: "outline",
  SUSPENDED: "destructive",
};

export default async function AdminGymsPage() {
  await requireRole("PLATFORM_SUPER_ADMIN");

  const gyms = await db.gym.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { users: true, membershipPlans: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gyms</h1>
        <p className="text-muted-foreground">Every tenant running on Kailon, with signup date and size.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{gyms.length} {gyms.length === 1 ? "gym" : "gyms"}</CardTitle>
        </CardHeader>
        <CardContent>
          {gyms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No gyms have signed up yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gym</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Plans</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gyms.map((gym) => (
                  <TableRow key={gym.id}>
                    <TableCell className="font-medium">{gym.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{gym.gymCode}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_STYLE[gym.status]}>{gym.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{gym.owner.name}</span>
                        {gym.owner.email && (
                          <span className="text-xs text-muted-foreground">{gym.owner.email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{gym._count.users}</TableCell>
                    <TableCell className="text-right">{gym._count.membershipPlans}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(gym.createdAt)}</TableCell>
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
