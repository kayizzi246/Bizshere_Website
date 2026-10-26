/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a second build (e.g. a CI or verification build) use its own folder
  // without disturbing a running `next dev`. Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
