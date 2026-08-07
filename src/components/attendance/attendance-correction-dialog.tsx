"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { correctAttendanceSchema, type CorrectAttendanceInput } from "@/lib/validations/attendance";
import { correctAttendanceAction } from "@/lib/actions/attendance.actions";
import type { AttendanceListItem } from "@/lib/data/attendance";

/** `<input type="datetime-local">` wants "YYYY-MM-DDTHH:mm" in local time. */
function toLocalInputValue(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AttendanceCorrectionDialog({ record }: { record: AttendanceListItem }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CorrectAttendanceInput>({
    resolver: zodResolver(correctAttendanceSchema),
    defaultValues: {
      attendanceId: record.id,
      checkInAt: toLocalInputValue(record.checkInAt),
      checkOutAt: toLocalInputValue(record.checkOutAt),
    },
  });

  async function onSubmit(values: CorrectAttendanceInput) {
    setLoading(true);
    const result = await correctAttendanceAction(values);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Attendance updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Correct attendance for {record.memberName}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>{record.memberName} — corrections are written to the audit log.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="checkInAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="checkOutAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-out (leave blank if still checked in)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
