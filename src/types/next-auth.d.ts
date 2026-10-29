import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string; role: Role };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    /** When role and suspension were last re-read from the database (ms). */
    checkedAt?: number;
    /** Staff only: the session stops counting as staff after this time (ms). */
    staffUntil?: number;
  }
}
