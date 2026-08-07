import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ListPageSkeleton({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Header with button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-md rounded-md" />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {Array.from({ length: columns }).map((_, i) => (
                    <th key={i} className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }).map((_, row) => (
                  <tr key={row} className="border-b last:border-0">
                    {Array.from({ length: columns }).map((_, col) => (
                      <td key={col} className="p-4">
                        <Skeleton
                          className="h-4"
                          style={{ width: `${60 + Math.floor(Math.random() * 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
