import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// First line of defence. Pages also check roles on the server (src/lib/access.ts).
// Signed out: sent to /login, which shows the staff sign-in and comes back here afterwards.
// Signed in but not staff: sent to the homepage.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
    if (token.role !== "ADMIN" && token.role !== "EDITOR") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } },
);

// Businesses are onboarded and managed by the admin; there is no business self-service area.
export const config = { matcher: ["/admin/:path*"] };
