import { notFound } from "next/navigation";

/**
 * Any address that matches no page: hand it to the site's own "page not found" (../not-found.tsx), which keeps
 * the header and footer and offers search and every section. Without this, a mistyped address showed
 * the bare built-in 404.
 */
// Never listed by search engines
export const metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function Missing() {
  notFound();
}
