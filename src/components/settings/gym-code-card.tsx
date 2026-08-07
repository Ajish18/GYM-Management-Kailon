"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function GymCodeCard({ gymCode, gymName }: { gymCode: string; gymName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(gymCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Your Gym ID
        </CardTitle>
        <CardDescription>
          Share this with trainers and members — they’ll enter it on the “Join Gym” page along
          with their own email and password to reach {gymName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border bg-secondary px-5 py-3 font-mono text-2xl font-semibold tracking-[0.3em]">
            {gymCode}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy Gym ID">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
