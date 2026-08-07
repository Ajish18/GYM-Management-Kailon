"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin animated progress bar at the top of the viewport that fires during
 * client-side route transitions.  It auto-starts when the pathname changes
 * and completes once React finishes rendering the new route's RSC payload.
 *
 * This gives users immediate visual feedback so they never stare at a
 * "blank" screen wondering if the click registered.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    // pathname changed → start the bar
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setVisible(true);
      setProgress(0);

      // Fast ramp to 90 %, then slow crawl — mimics nprogress / turbopack
      let p = 0;
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        p += (100 - p) * 0.15;
        if (p > 92) p = 92; // cap — the bar completes in the finish effect
        setProgress(p);
      }, 80);

      return () => clearInterval(timerRef.current);
    }
  }, [pathname]);

  // Once pathname has settled, ramp to 100 % and fade out
  useEffect(() => {
    if (visible && progress > 0) {
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible && progress === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transition: progress >= 100 ? "width 0.2s, opacity 0.2s" : "width 0.08s",
        }}
      />
    </div>
  );
}
