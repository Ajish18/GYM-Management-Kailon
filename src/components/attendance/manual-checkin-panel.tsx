"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberStatusBadge } from "@/components/members/status-badge";
import { manualCheckInAction, manualCheckOutAction } from "@/lib/actions/attendance.actions";
import type { CheckinRosterItem, OpenSessionItem } from "@/lib/data/attendance";

function elapsedLabel(checkInAt: Date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(checkInAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Owner/Receptionist manual check-in panel: search the gym roster, check
 *  someone in, and see/close everyone currently checked in. Gym rosters are
 *  small enough at launch scale to search client-side against the full list
 *  passed in via `roster` — swap for a debounced server search if that stops
 *  being true. */
export function ManualCheckinPanel({
  roster,
  openSessions,
}: {
  roster: CheckinRosterItem[];
  openSessions: OpenSessionItem[];
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const router = useRouter();

  const openMemberIds = useMemo(() => new Set(openSessions.map((s) => s.memberId)), [openSessions]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return roster
      .filter((m) => !openMemberIds.has(m.id))
      .filter((m) => m.name.toLowerCase().includes(q) || (m.phone ?? "").includes(q))
      .slice(0, 8);
  }, [query, roster, openMemberIds]);

  function handleCheckIn(memberId: string) {
    setActingId(memberId);
    startTransition(async () => {
      const result = await manualCheckInAction({ memberId });
      setActingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Checked in");
      setQuery("");
      router.refresh();
    });
  }

  function handleCheckOut(attendanceId: string) {
    setActingId(attendanceId);
    startTransition(async () => {
      const result = await manualCheckOutAction({ attendanceId });
      setActingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Checked out");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check in a member</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {query.trim() && (
          <div className="divide-y rounded-lg border">
            {matches.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No matching members</p>
            ) : (
              matches.map((m) => {
                const blocked = m.status !== "active";
                const isActing = pending && actingId === m.id;
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.phone ?? "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MemberStatusBadge status={m.status} />
                      <Button size="sm" disabled={blocked || isActing} onClick={() => handleCheckIn(m.id)}>
                        {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                        Check in
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            Currently checked in ({openSessions.length})
          </h4>
          {openSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is checked in right now.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {openSessions.map((s) => {
                const isActing = pending && actingId === s.id;
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <div className="font-medium">{s.memberName}</div>
                      <div className="text-xs text-muted-foreground">
                        Since{" "}
                        {new Date(s.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {elapsedLabel(s.checkInAt)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={isActing} onClick={() => handleCheckOut(s.id)}>
                      {isActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Check out
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
