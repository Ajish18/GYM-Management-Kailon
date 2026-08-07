import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      gymId: string | null;
    } & DefaultSession["user"];
    /** UserSession.jti for this session — lets server actions revoke every
     *  *other* active session (e.g. on password change) without logging
     *  out the device that just made the change. */
    sessionId?: string;
  }

  interface User {
    role: UserRole;
    gymId: string | null;
  }
}

// `next-auth/jwt` re-exports JWT from `@auth/core/jwt` — the interface is
// actually declared in the latter, so that's the module augmentation must
// target for declaration merging to apply where NextAuthConfig's internal
// types resolve it.
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    role?: UserRole;
    gymId?: string | null;
    /** Points at UserSession.jti — our own revocable-session record, kept
     *  distinct from the JWT's own reserved `jti` claim. */
    sid?: string;
  }
}
