import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// First line of defence. Pages also check roles on the server (src/lib/access.ts).
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (path.startsWith("/admin") && role !== "ADMIN" && role !== "EDITOR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  { pages: { signIn: "/login" } },
);

// Businesses are onboarded and managed by the admin; there is no business self-service area.
export const config = { matcher: ["/admin/:path*"] };
