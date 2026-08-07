import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

export default function TrainerWorkoutsLoading() {
  return <CardGridSkeleton columns={2} cards={3} />;
}
