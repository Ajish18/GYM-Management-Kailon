import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

export default function MemberDietLoading() {
  return <CardGridSkeleton columns={2} cards={2} />;
}
