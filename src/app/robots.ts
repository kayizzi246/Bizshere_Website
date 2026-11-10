import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/** What search engines may index: the public site, never the admin, accounts, sign-in or payment pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/me", "/login", "/signup", "/payments/", "/supplier", "/expert", "/search?"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
