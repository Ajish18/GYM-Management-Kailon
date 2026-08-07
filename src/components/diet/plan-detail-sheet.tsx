"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getDietPlanDetailAction,
  addDietNoteAction,
  addSupplementAction,
  deleteSupplementAction,
} from "@/lib/actions/diet.actions";
import { formatDate } from "@/lib/format";

type PlanDetail = Awaited<ReturnType<typeof getDietPlanDetailAction>>;
type LoadedDetail = Extract<PlanDetail, { success: true }>["data"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function macro(value: unknown) {
  return value != null ? Number(value) : null;
}

export function PlanDetailSheet({
  planId,
  memberName,
  trigger,
}: {
  planId: string;
  memberName: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<LoadedDetail | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(todayIso());
  const [savingNote, setSavingNote] = useState(false);
  const [supName, setSupName] = useState("");
  const [supDosage, setSupDosage] = useState("");
  const [supTiming, setSupTiming] = useState("");
  const [savingSupplement, setSavingSupplement] = useState(false);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const result = await getDietPlanDetailAction(planId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setDetail(result.data);
  }

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !detail) await load();
  }

  async function onAddNote() {
    if (!noteText.trim()) {
      toast.error("Write a note first");
      return;
    }
    setSavingNote(true);
    const result = await addDietNoteAction({ dietPlanId: planId, noteDate, note: noteText });
    setSavingNote(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Note added");
    setNoteText("");
    await load();
    router.refresh();
  }

  async function onAddSupplement() {
    if (!detail || !supName.trim()) {
      toast.error("Enter a supplement name");
      return;
    }
    setSavingSupplement(true);
    const result = await addSupplementAction({
      memberId: detail.plan.memberId,
      dietPlanId: planId,
      name: supName,
      dosage: supDosage,
      timingNote: supTiming,
    });
    setSavingSupplement(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplement added");
    setSupName("");
    setSupDosage("");
    setSupTiming("");
    await load();
    router.refresh();
  }

  async function onDeleteSupplement(id: string) {
    const result = await deleteSupplementAction(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    await load();
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={trigger} />
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{memberName}&apos;s diet plan</SheetTitle>
          <SheetDescription>Meals, adherence notes, and supplement recommendations.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          {loading && !detail && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {detail && (
            <Tabs defaultValue="meals">
              <TabsList className="w-full">
                <TabsTrigger value="meals" className="flex-1">
                  Meals
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">
                  Notes
                </TabsTrigger>
                <TabsTrigger value="supplements" className="flex-1">
                  Supplements
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meals" className="mt-4 space-y-3">
                {detail.plan.meals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meals on this plan.</p>
                ) : (
                  detail.plan.meals.map((meal) => (
                    <div key={meal.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{meal.mealName}</p>
                        {meal.timeSlot && (
                          <span className="text-xs text-muted-foreground">{meal.timeSlot}</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {meal.calories != null ? `${meal.calories} kcal` : "— kcal"} · P{" "}
                        {macro(meal.proteinG) ?? "—"}g · C {macro(meal.carbsG) ?? "—"}g · F{" "}
                        {macro(meal.fatG) ?? "—"}g
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr]">
                    <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
                    <Textarea
                      placeholder="How did they stick to the plan today?"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={onAddNote} disabled={savingNote}>
                    {savingNote && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add note
                  </Button>
                </div>
                {detail.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.notes.map((note) => (
                      <div key={note.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(note.noteDate)}</span>
                          <span>{note.createdBy.name}</span>
                        </div>
                        <p className="mt-1 text-sm">{note.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="supplements" className="mt-4 space-y-4">
                <div className="space-y-2 rounded-lg border p-3">
                  <Input
                    placeholder="Supplement name (e.g. Whey protein)"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Dosage (e.g. 30g)"
                      value={supDosage}
                      onChange={(e) => setSupDosage(e.target.value)}
                    />
                    <Input
                      placeholder="Timing (e.g. post-workout)"
                      value={supTiming}
                      onChange={(e) => setSupTiming(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={onAddSupplement} disabled={savingSupplement}>
                    {savingSupplement && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add supplement
                  </Button>
                </div>
                {detail.supplements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No supplements recommended yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.supplements.map((sup) => (
                      <div key={sup.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{sup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[sup.dosage, sup.timingNote].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => onDeleteSupplement(sup.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {detail && (
            <div className="mt-4">
              <Badge variant="outline">{detail.plan.template?.name ?? "Custom plan"}</Badge>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
