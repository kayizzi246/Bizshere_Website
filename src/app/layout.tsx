import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "primeicons/primeicons.css";
import "../styles/primereact-theme.css";
import "./globals.css";
import { Providers } from "./providers";
import { ImageFit } from "@/components/ImageFit";
import { site } from "@/config/site";

// One font on the whole site (client, 13 Nov 2026, after an example site): Inter for headings and body text alike.
// Headings in Bold (700) with tight letter spacing, the big homepage headline in ExtraBold (800), body text in
// Regular to Semibold. Self-hosted by next/font: no request to Google, no layout shift on load.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

// The browser bar in the site's navy on phones, and the same when opened from the home screen (manifest.ts)
export const viewport: Viewport = { themeColor: "#071A33" };

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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <ImageFit />
      </body>
    </html>
  );
}
