import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "primeicons/primeicons.css";
import "../styles/primereact-theme.css";
import "./globals.css";
import { Providers } from "./providers";
import { ImageFit } from "@/components/ImageFit";
import { site } from "@/config/site";

// Two fonts (client, 24 Nov 2026): Manrope for headings, navigation and titles (below), Inter for everything else.
// Headings in Bold (700) with tight letter spacing, the big homepage headline in ExtraBold (800), body text in
// Regular to Semibold.
//
// The file is kept in the repo and loaded with next/font/local (17 Nov 2026). It used to come from
// next/font/google, which downloads the font from Google *during the build*: that fetch has no way out of
// the Coolify build container, so every deploy died in layout.tsx with "An error occurred in next/font —
// Cannot read properties of null (reading '1')" (the loader regex-matching an answer it never got). The
// file is the same one Google serves — Inter v20, latin subset, variable 400-800 — so nothing about the
// type changes; the build simply no longer needs the network.
const inter = localFont({
  src: "../fonts/inter-latin-var.woff2",
  weight: "400 900", // one variable file covers the whole range (Black, 900, is the hero headline)
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// Headings, navigation and titles (client, 24 Nov 2026, from their typography sheet): Manrope, Medium to ExtraBold.
// Inter does the rest: body text, forms, tables, buttons and labels. Kept in the repo like Inter, under the SIL
// Open Font License (src/fonts/manrope-LICENSE.txt).
const manrope = localFont({
  src: "../fonts/manrope-latin-var.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-heading",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// The italic serif for the second half of some homepage headings ("Operators, *not lecturers*" style; client,
// 25 Nov 2026). Instrument Serif Italic, kept in the repo like the others under the SIL Open Font License
// (src/fonts/instrument-serif-LICENSE.txt). Used only through .head-serif in globals.css.
const serif = localFont({
  src: "../fonts/instrument-serif-italic-latin.woff2",
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

// The browser bar in the site's navy on phones, and the same when opened from the home screen (manifest.ts)
export const viewport: Viewport = { themeColor: "#0d1117" };

// What search engines and shared links show. metadataBase turns every page's relative picture into a
// full address; the share picture is src/app/opengraph-image.tsx; the sitemap and robots files sit beside it.
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "BizSphere-Ug: B2B Information Portal for business in Uganda", template: "%s | BizSphere-Ug" },
  description: "Market prices, business ideas with real costs, trusted suppliers, business machines, funding sources, experts, guides and tools for starting and running a business in Uganda.",
  applicationName: "BizSphere-Ug",
  keywords: ["business ideas Uganda", "suppliers Uganda", "business machines Uganda", "funding for SMEs Uganda", "market prices Uganda", "business experts Kampala", "start a business in Uganda"],
  openGraph: { type: "website", siteName: "BizSphere-Ug", locale: "en_UG", url: site.url },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: ScrollEffects adds `reveal-ready` to <html> on the client.
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <ImageFit />
      </body>
    </html>
  );
}
