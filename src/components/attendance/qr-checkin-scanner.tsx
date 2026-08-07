"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogIn, LogOut, ScanLine, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { qrCheckInAction, qrCheckOutAction } from "@/lib/actions/attendance.actions";
import { cn } from "@/lib/utils";

type Mode = "checkin" | "checkout";

/** Reception QR check-in. Uses the browser's native BarcodeDetector where
 *  available (Chromium) and falls back to manual code entry — the front desk
 *  can always type a member id even if the camera is unavailable. Scans are
 *  debounced so one code can't double-fire. */
export function QrCheckinScanner() {
  const [mode, setMode] = useState<Mode>("checkin");
  const [manualId, setManualId] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "active" | "unsupported" | "error">("idle");
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef(false);
  const router = useRouter();

  // Keep the latest mode reachable from the camera loop without re-spawning it.
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const handleCode = useCallback(
    (memberId: string) => {
      const id = memberId.trim();
      if (!id || processingRef.current) return;
      processingRef.current = true;
      const verb = modeRef.current === "checkin" ? "Checked in" : "Checked out";
      const action = modeRef.current === "checkin" ? qrCheckInAction : qrCheckOutAction;
      startTransition(async () => {
        const result = await action({ memberId: id });
        processingRef.current = false;
        setLastResult(
          result.success
            ? { ok: true, message: `${verb} ${result.data?.memberName ?? ""}` }
            : { ok: false, message: result.error },
        );
        if (result.success) toast.success(`${verb} ${result.data?.memberName ?? ""}`);
        else toast.error(result.error);
        router.refresh();
      });
    },
    [router],
  );

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleCode(manualId);
    setManualId("");
  }

  // Camera scanning loop — BarcodeDetector is a progressive enhancement.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let detector: { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } | null = null;

    async function startCamera() {
      if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
        setCameraState("unsupported");
        return;
      }
      setCameraState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraState("active");
        const BarcodeDetectorCtor = (
          window as unknown as {
            BarcodeDetector: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
          }
        ).BarcodeDetector;
        detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !video || !detector) return;
          if (video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0 && !processingRef.current) {
                handleCode(codes[0].rawValue);
              }
            } catch {
              // frame decode errors are transient — keep scanning
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setCameraState("error");
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [handleCode]);

  const cameraHint =
    cameraState === "unsupported"
      ? "This browser can't scan QR codes — use manual entry below."
      : cameraState === "error"
        ? "Camera unavailable — use manual entry below."
        : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Scan a member&apos;s QR
          </CardTitle>
          <CardDescription>
            Point the camera at a member&apos;s QR code to {mode === "checkin" ? "check them in" : "check them out"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex overflow-hidden rounded-xl border">
            <button
              type="button"
              onClick={() => setMode("checkin")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                mode === "checkin" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
              )}
            >
              <LogIn className="h-4 w-4" />
              Check in
            </button>
            <button
              type="button"
              onClick={() => setMode("checkout")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                mode === "checkout" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
              )}
            >
              <LogOut className="h-4 w-4" />
              Check out
            </button>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {(cameraState === "starting" || cameraState === "idle") && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting camera…
              </div>
            )}
            {cameraState === "unsupported" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/80">
                <ScanLine className="h-8 w-8 opacity-60" />
                Camera scanning unavailable
              </div>
            )}
            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-white/80">
                <XCircle className="h-8 w-8 opacity-60" />
                Could not access the camera
              </div>
            )}
            {cameraState === "active" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-xl border-2 border-primary/70" />
              </div>
            )}
          </div>

          {cameraHint && <p className="text-sm text-muted-foreground">{cameraHint}</p>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual entry</CardTitle>
            <CardDescription>
              Type the member ID shown on their QR page if scanning isn&apos;t working.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Paste member ID…"
                className="font-mono text-xs"
                aria-label="Member ID"
              />
              <Button type="submit" disabled={!manualId.trim() || pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "checkin" ? "Check in" : "Check out"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {lastResult && (
          <Card className={cn(lastResult.ok ? "border-success/40" : "border-destructive/40")}>
            <CardContent className="flex items-center gap-3 py-4">
              {lastResult.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <p className={cn("text-sm", lastResult.ok ? "text-foreground" : "text-muted-foreground")}>{lastResult.message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
