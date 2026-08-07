import { MemberStatusBadge } from "@/components/members/status-badge";
import { ReportTable } from "@/components/reports/report-table";
import type { MemberReportRow } from "@/lib/data/reports";
import { formatCurrency, formatDate } from "@/lib/format";

/** Member Report — one row per member with their derived status, current
 *  plan and outstanding dues. */
export function MemberReportTable({ data }: { data: MemberReportRow[]; filters?: unknown }) {
  const activeCount = data.filter((r) => r.status === "active").length;
  const totalDues = data.reduce((sum, r) => sum + r.duesAmount, 0);

  return (
    <ReportTable<MemberReportRow>
      title="Member report"
      description="All members and their membership snapshot"
      summary={`${data.length} members · ${activeCount} active · ${formatCurrency(totalDues)} outstanding dues`}
      data={data}
      keyFn={(r) => r.memberId}
      emptyTitle="No members found"
      emptyDescription="Adjust the filters or add members to see them here."
      columns={[
        {
          header: "Member",
          cell: (r) => (
            <div>
              <p className="font-medium">{r.name}</p>
              <div className="mt-0.5">
                <MemberStatusBadge status={r.status} />
              </div>
            </div>
          ),
        },
        { header: "Plan", cell: (r) => r.planName ?? "—" },
        { header: "Joined", cell: (r) => formatDate(r.joinDate) },
        { header: "Expires", cell: (r) => (r.expiryDate ? formatDate(r.expiryDate) : "—") },
        { header: "Trainer", cell: (r) => r.trainerName ?? "—" },
        {
          header: "Last visit",
          cell: (r) => (r.lastAttendance ? formatDate(r.lastAttendance) : "Never"),
        },
        {
          header: "Dues",
          className: "text-right",
          cell: (r) =>
            r.duesAmount > 0 ? (
              <span className="font-medium text-destructive">{formatCurrency(r.duesAmount)}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
      ]}
    />
  );
}
