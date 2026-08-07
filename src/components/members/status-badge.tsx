import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_BADGE_VARIANT, type DerivedMemberStatus } from "@/lib/member-status";

export function MemberStatusBadge({ status }: { status: DerivedMemberStatus }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
