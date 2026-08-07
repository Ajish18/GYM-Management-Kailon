"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logWaterAction } from "@/lib/actions/diet.actions";
import { DEFAULT_WATER_TARGET_ML } from "@/lib/validations/diet";

const QUICK_AMOUNTS = [250, 500, 750];

export function WaterTracker({ todayTotalMl }: { todayTotalMl: number }) {
  const [total, setTotal] = useState(todayTotalMl);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function addWater(amountMl: number) {
    if (amountMl <= 0) return;
    setLoading(true);
    const result = await logWaterAction({ amountMl });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTotal(result.data.totalMl);
    setCustomAmount("");
    router.refresh();
  }

  const percent = Math.min(100, Math.round((total / DEFAULT_WATER_TARGET_ML) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" />
          Water intake
        </CardTitle>
        <CardDescription>
          {total} ml of {DEFAULT_WATER_TARGET_ML} ml target today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} />

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <Button key={amount} variant="outline" size="sm" disabled={loading} onClick={() => addWater(amount)}>
              + {amount} ml
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            placeholder="Custom (ml)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <Button
            disabled={loading || !customAmount}
            onClick={() => addWater(Number(customAmount))}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
