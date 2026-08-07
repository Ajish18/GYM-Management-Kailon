import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
