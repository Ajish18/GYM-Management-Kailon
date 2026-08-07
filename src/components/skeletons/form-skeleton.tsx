import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-28 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
