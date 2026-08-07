import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireGymScope } from "@/lib/auth/guards";
import { listMembers, listTrainersForGym, listActivePlans } from "@/lib/data/members";
import { MemberSearch } from "@/components/members/member-search";
import { CreateMemberDialog } from "@/components/members/create-member-dialog";
import { MemberTable } from "@/components/members/member-table";

export const metadata: Metadata = { title: "Members" };

export default async function ReceptionMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { gymId } = await requireGymScope("RECEPTIONIST");
  const { q, page } = await searchParams;

  const [{ items, totalPages, page: currentPage }, trainers, plans] = await Promise.all([
    listMembers({ gymId, search: q, page: page ? Number(page) : 1 }),
    listTrainersForGym(gymId),
    listActivePlans(gymId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-muted-foreground">Register new members and collect renewal payments.</p>
        </div>
        <CreateMemberDialog />
      </div>

      <MemberSearch />

      <MemberTable members={items} plans={plans} trainers={trainers} canDelete={false} hasQuery={!!q} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            nativeButton={false}
            render={<Link href={`?q=${q ?? ""}&page=${currentPage - 1}`}>Previous</Link>}
          />
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            nativeButton={false}
            render={<Link href={`?q=${q ?? ""}&page=${currentPage + 1}`}>Next</Link>}
          />
        </div>
      )}
    </div>
  );
}
