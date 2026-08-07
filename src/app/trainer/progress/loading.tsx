import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

export default function TrainerProgressLoading() {
  return <CardGridSkeleton columns={3} cards={3} />;
}
