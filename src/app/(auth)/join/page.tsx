import { Suspense } from "react";
import type { Metadata } from "next";
import { JoinGymFlow } from "./join-flow";

export const metadata: Metadata = { title: "Join your gym" };

export default function JoinGymPage() {
  return (
    <Suspense>
      <JoinGymFlow />
    </Suspense>
  );
}
