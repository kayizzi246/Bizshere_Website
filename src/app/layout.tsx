import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "primeicons/primeicons.css";
import "../styles/primereact-theme.css";
import "./globals.css";
import { Providers } from "./providers";

// Brand typography (style guide, section 5). Both are variable fonts, self-hosted by
// next/font, so there is no request to Google and no layout shift on load.
//   Manrope: headings, navigation, hero text, UI titles (Medium–ExtraBold)
//   Inter:   body text, forms, tables, buttons, labels (Regular–Semibold)
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BizSphere-Ug", template: "%s | BizSphere-Ug" },
  description: "Find the idea, machines, suppliers and funding to start your business in Uganda.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: ScrollEffects adds `reveal-ready` to <html> on the client.
    <html lang="en" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
