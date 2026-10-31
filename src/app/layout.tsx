import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "primeicons/primeicons.css";
import "../styles/primereact-theme.css";
import "./globals.css";
import { Providers } from "./providers";

// Brand typography: Inter everywhere (client font recommendation, Oct 2026), Regular to ExtraBold.
// A variable font self-hosted by next/font, so there is no request to Google and no layout shift on load.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Hero headlines and the big footer wordmark: Plus Jakarta Sans ExtraBold, a rounder, bolder SaaS look.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["800"], variable: "--font-hero", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BizSphere-Ug", template: "%s | BizSphere-Ug" },
  description: "Find the idea, machines, suppliers and funding to start your business in Uganda.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: ScrollEffects adds `reveal-ready` to <html> on the client.
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
