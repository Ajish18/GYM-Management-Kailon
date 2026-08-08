"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleGlyph } from "@/components/google-glyph";

export function GoogleInviteButton() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Continue with the Google account for the email address above — that’s how you’ll sign in from now on.
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          signIn("google", { callbackUrl: "/role-redirect" });
        }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph className="h-4 w-4" />}
        Continue with Google
      </Button>
    </div>
  );
}
