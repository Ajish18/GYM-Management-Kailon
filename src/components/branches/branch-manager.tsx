"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GymBranch } from "@/lib/data/branches";
import {
  createBranchAction,
  setDefaultBranchAction,
  toggleBranchStatusAction,
} from "@/lib/actions/branches.actions";

export function BranchManager({ branches }: { branches: GymBranch[] }) {
  const [name, setName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await createBranchAction({ name, addressLine, city });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Branch added");
    setName("");
    setAddressLine("");
    setCity("");
    router.refresh();
  }

  async function onSetDefault(id: string) {
    setBusyId(id);
    const res = await setDefaultBranchAction(id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Default branch updated");
    router.refresh();
  }

  async function onToggle(id: string) {
    setBusyId(id);
    const res = await toggleBranchStatusAction(id);
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Branch updated");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {branches.length === 0 ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
                <p className="font-medium">No branches yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first branch — it becomes the default.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {branches.map((b) => {
              const active = b.status === "active";
              return (
                <Card key={b.id} className={cn(!active && "opacity-60")}>
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.name}</p>
                        {b.isDefault && (
                          <Badge variant="secondary" className="gap-1 text-streak">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                        {!active && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                      {(b.address?.line || b.address?.city) && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {[b.address?.line, b.address?.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!b.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetDefault(b.id)}
                          disabled={busyId === b.id}
                        >
                          {busyId === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Set default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggle(b.id)}
                        disabled={busyId === b.id || (b.isDefault && active)}
                      >
                        {busyId === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="h-fit lg:col-span-2">
        <CardHeader>
          <CardTitle>Add a branch</CardTitle>
          <CardDescription>
            Locations of your gym. The first one is the default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-3">
            <Input
              placeholder="Branch name (e.g. Koramangala)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Address line"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Button type="submit" disabled={saving || !name.trim()} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              Add branch
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
