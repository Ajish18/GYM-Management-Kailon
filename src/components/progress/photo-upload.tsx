"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadProgressPhotoAction } from "@/lib/actions/progress.actions";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Plain FormData submit (not react-hook-form) since the payload is a File —
 *  used by both the Member self-upload page and the Trainer recording page. */
export function PhotoUpload({ memberId }: { memberId?: string }) {
  const [pose, setPose] = useState<"FRONT" | "SIDE" | "BACK">("FRONT");
  const [takenAt, setTakenAt] = useState(todayIso());
  const [file, setFile] = useState<File | null>(null);
  // Bumped after a successful upload to remount the (uncontrolled) file
  // input — the simplest way to clear a native file input's selection.
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose a photo to upload");
      return;
    }

    const formData = new FormData();
    formData.set("pose", pose);
    formData.set("takenAt", takenAt);
    formData.set("file", file);
    if (memberId) formData.set("memberId", memberId);

    setLoading(true);
    const result = await uploadProgressPhotoAction(formData);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Photo uploaded");
    setFile(null);
    setFileInputKey((k) => k + 1);
    setTakenAt(todayIso());
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Add a progress photo
        </CardTitle>
        <CardDescription>Photos are private — only visible to this member and their gym staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Pose</Label>
              <Select value={pose} onValueChange={(v) => setPose(v as "FRONT" | "SIDE" | "BACK")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRONT">Front</SelectItem>
                  <SelectItem value="SIDE">Side</SelectItem>
                  <SelectItem value="BACK">Back</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={takenAt}
                max={todayIso()}
                onChange={(e) => setTakenAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <Input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload photo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
