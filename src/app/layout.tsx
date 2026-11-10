import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "primeicons/primeicons.css";
import "../styles/primereact-theme.css";
import "./globals.css";
import { Providers } from "./providers";
import { site } from "@/config/site";

// Brand typography (client style guide, section 5):
//   Manrope: headings, navigation, hero text, marketing pages, UI titles (Medium to ExtraBold).
//   Inter: body text, forms, tables, buttons, labels and details (Regular, Medium, Semibold).
// Only the guide's weights are loaded, so nothing can drift outside it: a heavier class (font-bold on
// Inter, font-black on Manrope) is drawn with the heaviest weight the guide allows (Inter Semibold,
// Manrope ExtraBold). Self-hosted by next/font: no request to Google, no layout shift on load.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
// Inter Black (900), loaded as its own family so body "bold" never turns Black: only the big hero
// headlines use it (.text-hero in globals.css), at the client's request (Manrope stops at 800).
const heroFont = Inter({ subsets: ["latin"], weight: "900", variable: "--font-hero", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });

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
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${heroFont.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
