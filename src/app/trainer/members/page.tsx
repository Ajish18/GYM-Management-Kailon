import type { Metadata } from "next";
import Link from "next/link";
import { requireGymScope } from "@/lib/auth/guards";
import { listMembers } from "@/lib/data/members";
import { STATUS_LABEL } from "@/lib/member-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, Dumbbell, Salad, LineChart } from "lucide-react";

export const metadata: Metadata = { title: "My Members" };

export default async function TrainerMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { user, gymId } = await requireGymScope("TRAINER");
  const { search, page } = await searchParams;

  const result = await listMembers({
    gymId,
    trainerId: user.id,
    search,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Members</h1>
          <p className="text-muted-foreground">
            {result.total} member{result.total !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Roster</CardTitle>
          <CardDescription>View and manage your assigned members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form className="flex-1" method="GET" action="">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search members..."
                  defaultValue={search ?? ""}
                  className="pl-10"
                />
              </div>
            </form>
          </div>

          {result.items.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No members found</h3>
              <p className="text-muted-foreground">
                {search
                  ? "Try adjusting your search terms."
                  : "You don't have any members assigned to you yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {member.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.image}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{member.name}</div>
                              {member.phone && (
                                <div className="text-sm text-muted-foreground">{member.phone}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.status === "active"
                                ? "default"
                                : member.status === "expired"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {STATUS_LABEL[member.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.planName ?? "—"}</TableCell>
                        <TableCell>
                          {member.expiresAt
                            ? new Date(member.expiresAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              nativeButton={false}
                              render={
                                <Link href={`/trainer/members/${member.id}/workouts`}>
                                  <Dumbbell className="h-4 w-4" />
                                </Link>
                              }
                              title="Workouts"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              nativeButton={false}
                              render={
                                <Link href={`/trainer/members/${member.id}/diet`}>
                                  <Salad className="h-4 w-4" />
                                </Link>
                              }
                              title="Diet"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              nativeButton={false}
                              render={
                                <Link href={`/trainer/members/${member.id}/progress`}>
                                  <LineChart className="h-4 w-4" />
                                </Link>
                              }
                              title="Progress"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page <= 1}
                    nativeButton={false}
                    render={
                      <Link
                        href={`?page=${result.page - 1}${search ? `&search=${search}` : ""}`}
                      >
                        Previous
                      </Link>
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Page {result.page} of {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page >= result.totalPages}
                    nativeButton={false}
                    render={
                      <Link
                        href={`?page=${result.page + 1}${search ? `&search=${search}` : ""}`}
                      >
                        Next
                      </Link>
                    }
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}