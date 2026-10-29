const dev = process.env.NODE_ENV !== "production";

/**
 * Security headers on every response.
 * The Content-Security-Policy lists the only outside sources the site uses: YouTube for the
 * homepage video, and any https image (photos are credited from other sites). Next.js needs
 * inline scripts and styles; development also needs eval and a websocket for hot reload.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  // Google sign-in and card payments continue on their own sites after a form post.
  "form-action 'self' https:",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a second build (e.g. a CI or verification build) use its own folder
  // without disturbing a running `next dev`. Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Admin, account and sign-in pages are never cached by the browser or a proxy.
      ...["/admin/:path*", "/account/:path*", "/login", "/staff/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      })),
    ];
  },
};

export default nextConfig;
