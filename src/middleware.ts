import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// First line of defence. Pages also check roles on the server (src/lib/access.ts).
// Anyone who isn't staff (signed out, or signed in as a member) is sent to /login, which shows
// the staff sign-in and comes back here afterwards. Signing in there replaces a member session.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role;
    // Staff sessions end after a working day (src/lib/auth.ts, STAFF_SESSION_HOURS).
    const expired = !token?.staffUntil || token.staffUntil < Date.now();
    if ((role !== "ADMIN" && role !== "EDITOR") || expired) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } },
);

// Businesses are onboarded and managed by the admin; there is no business self-service area.
export const config = { matcher: ["/admin/:path*"] };
