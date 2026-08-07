import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

export default function MemberProgressLoading() {
  return <CardGridSkeleton columns={3} cards={3} />;
}
