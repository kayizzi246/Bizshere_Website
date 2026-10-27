import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// First line of defence. Pages also check roles on the server (src/lib/access.ts).
// Anyone who isn't staff is sent to the homepage, not to a login page: staff sign in
// at their private link (/staff/<ADMIN_LOGIN_KEY>).
export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    if (role !== "ADMIN" && role !== "EDITOR") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  },
  { callbacks: { authorized: () => true } },
);

// Businesses are onboarded and managed by the admin; there is no business self-service area.
export const config = { matcher: ["/admin/:path*"] };
