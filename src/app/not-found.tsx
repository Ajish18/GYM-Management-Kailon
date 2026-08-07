import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-8" />
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Compass className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Button className="mt-8" nativeButton={false} render={<Link href="/">Go to home</Link>} />
    </div>
  );
}
