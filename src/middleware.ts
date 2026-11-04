import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

/**
 * First line of defence, run at the edge before any page or database is touched.
 *
 * 1. Bots and scanners: requests for things this site never has (WordPress, PHP, .env, .git…),
 *    known attack tools, and odd HTTP methods get a bare 404 or 405. They are probes looking for
 *    a weakness; answering them with the real app only costs time and database load.
 * 2. Admin: anyone who isn't staff (signed out, or signed in as a member) is sent to /login, which
 *    shows the staff sign-in and comes back here afterwards. Pages also check roles on the server
 *    (src/lib/access.ts); this is the first check, not the only one.
 *
 * Volume attacks (floods, DDoS) are stopped before this, by the host's firewall: see
 * docs/10-security.md.
 */

// Paths only an attacker asks for. This site has no PHP, ASP or WordPress, and no dot-files are served.
const PROBE = /(^|\/)(\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.ds_store|\.htaccess|\.htpasswd|wp-admin|wp-login|wp-content|wp-includes|wp-json|xmlrpc|phpmyadmin|pma|adminer|cgi-bin|vendor\/phpunit|server-status|actuator|boaform|HNAP1|owa|autodiscover)(\/|$|\.)|\.(php\d?|aspx?|jsp|cgi|asp|env|sql|bak|old|swp|ini|log)$/i;
// Tools made for finding and exploiting weaknesses (not ordinary browsers, crawlers or Pesapal).
const ATTACK_TOOL = /sqlmap|nikto|nmap|masscan|zgrab|acunetix|nessus|openvas|wpscan|dirbuster|gobuster|feroxbuster|ffuf|nuclei|havij|w3af|arachni|joomscan|commix|xsstrike|jaeles|wfuzz/i;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

const blocked = (status: number) => new NextResponse(status === 405 ? "Method not allowed" : "Not found", { status, headers: { "Cache-Control": "no-store" } });

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!ALLOWED_METHODS.has(req.method)) return blocked(405);
  // /.well-known is the standard place for security.txt, app links and certificate checks.
  if (!path.startsWith("/.well-known/") && PROBE.test(path)) return blocked(404);
  if (ATTACK_TOOL.test(req.headers.get("user-agent") ?? "")) return blocked(404);

  if (path === "/admin" || path.startsWith("/admin/")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = token?.role;
    // Staff sessions end after a working day (src/lib/auth.ts, STAFF_SESSION_HOURS).
    const expired = !token?.staffUntil || token.staffUntil < Date.now();
    if ((role !== "ADMIN" && role !== "EDITOR") || expired) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", path + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

// Everything except Next.js's own static files and the site's public images, which need no checks.
export const config = { matcher: ["/((?!_next/static|_next/image|brand/|ideas/|machines/|illustrations/|samples/|uploads/|icon.png|favicon.ico).*)"] };
