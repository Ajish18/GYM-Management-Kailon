import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";
import { getRoleHome } from "@/lib/auth/roles";

// Rewritten on top of `getToken` (next-auth/jwt) instead of `NextAuth(authConfig)`
// because bundling the full auth wrapper into the Edge runtime produced
// "EvalError: Code generation from strings disallowed for this context" at
// runtime — every request 500'd. `getToken` only decrypts the session cookie
// (same AUTH_SECRET, same claims), which is all this first-pass gate needs.
//
// Like the old config.edge approach, this is a UX optimization, NOT the
// security boundary: middleware can't open a DB connection, so it trusts the
// claims already embedded in the JWT at sign-in. The authoritative check —
// including immediate account deactivation / role change — runs server-side
// in layouts/route handlers/server actions via auth() from config.ts.
//
// The role → home mapping lives in src/lib/auth/roles.ts (single source of
// truth with the post-login redirect route at /role-redirect).

const ROUTE_PREFIX_ROLES: Record<string, UserRole[]> = {
  "/admin": ["PLATFORM_SUPER_ADMIN"],
  "/owner": ["GYM_OWNER"],
  "/reception": ["RECEPTIONIST"],
  "/trainer": ["TRAINER"],
  "/member": ["MEMBER"],
};

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/invite",
  "/join",
  "/role-redirect",
  "/forgot-password",
  "/reset-password",
];
// Authenticated users hitting these get bounced to their dashboard instead
// of seeing a signed-out landing/auth page.
const REDIRECT_IF_AUTHED = [
  "/",
  "/login",
  "/register",
  "/join",
  "/role-redirect",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const role = (token?.role as UserRole | undefined) ?? undefined;

  if (isPublicPath(pathname)) {
    if (role && REDIRECT_IF_AUTHED.some((p) => pathname === p)) {
      return NextResponse.redirect(new URL(getRoleHome(role), req.url));
    }
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const matchedPrefix = Object.keys(ROUTE_PREFIX_ROLES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (matchedPrefix && !ROUTE_PREFIX_ROLES[matchedPrefix]!.includes(role)) {
    return NextResponse.redirect(new URL(getRoleHome(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, images, and the auth API routes themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
