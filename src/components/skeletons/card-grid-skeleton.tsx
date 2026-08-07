import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CardGridSkeleton({
  columns = 2,
  cards = 2,
}: {
  columns?: number;
  cards?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div
        className={`grid grid-cols-1 gap-6 ${
          columns >= 3 ? "lg:grid-cols-3" : columns === 2 ? "lg:grid-cols-2" : ""
        }`}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
