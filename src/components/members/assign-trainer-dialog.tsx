"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignTrainerAction } from "@/lib/actions/members.actions";

export function AssignTrainerDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  currentTrainerId,
  trainers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  currentTrainerId: string | null;
  trainers: { id: string; name: string }[];
}) {
  const [trainerId, setTrainerId] = useState<string>(currentTrainerId ?? "unassigned");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onConfirm() {
    setLoading(true);
    const result = await assignTrainerAction({
      memberId,
      trainerId: trainerId === "unassigned" ? null : trainerId,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Trainer updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign trainer — {memberName}</DialogTitle>
          <DialogDescription>The trainer will see this member in their roster immediately.</DialogDescription>
        </DialogHeader>
        <Select value={trainerId} onValueChange={(value) => setTrainerId(value ?? "unassigned")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">No trainer</SelectItem>
            {trainers.map((trainer) => (
              <SelectItem key={trainer.id} value={trainer.id}>
                {trainer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
