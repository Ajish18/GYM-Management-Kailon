"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { selfCheckInAction, selfCheckOutAction } from "@/lib/actions/attendance.actions";

export function SelfCheckinButton({
  isCheckedIn,
  disabled,
}: {
  isCheckedIn: boolean;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const result = isCheckedIn ? await selfCheckOutAction() : await selfCheckInAction();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isCheckedIn ? "Checked out" : "Checked in — have a great workout");
    router.refresh();
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      variant={isCheckedIn ? "outline" : "default"}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isCheckedIn ? (
        <LogOut className="h-4 w-4" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {isCheckedIn ? "Check out" : "Check in"}
    </Button>
  );
}
