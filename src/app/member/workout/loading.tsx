import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

export default function MemberWorkoutLoading() {
  return <CardGridSkeleton columns={2} cards={2} />;
}
