import type { Metadata } from "next";
import { requireGymScope } from "@/lib/auth/guards";
import { BulkImportMembers } from "@/components/members/bulk-import";

export const metadata: Metadata = { title: "Import Members" };

export default async function OwnerImportMembersPage() {
  await requireGymScope("GYM_OWNER", "RECEPTIONIST");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import members</h1>
        <p className="text-muted-foreground">
          Bulk-register members from a spreadsheet in one go.
        </p>
      </div>
      <BulkImportMembers />
    </div>
  );
}
