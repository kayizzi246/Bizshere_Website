/**
 * Site identity and contact details in one place.
 *
 * Values marked TODO(client) are waiting on the Client Information Request
 * (docs/source/BizSphere-Ug_Client_Information_Request.pdf, tracked in
 * docs/06-client-information-checklist.md). When the client sends them:
 *   A1 logo / A2 icon   → public/brand/ + src/components/Logo.tsx + src/app/icon.png
 *   A3/A4 colours       → tailwind.config.ts (brand.*) — keep the token names
 *   A5 fonts            → src/app/layout.tsx (next/font) and fontFamily in tailwind.config.ts
 *   A7 slogan / tone    → `tagline` below
 */
type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  contact: { email: string; phone: string; whatsapp: string; address: string; hours: string };
  url: string;
  legalDraft: boolean;
};

export const site: SiteConfig = {
  name: "BizSphere-Ug",
  // TODO(client) A7: replace with the confirmed slogan.
  tagline: "From business idea to machines, suppliers, funding and expert help, in one place.",
  description: "Find the idea, machines, suppliers and funding to start your business in Uganda.",
  // TODO(client): public contact details. Leave empty until confirmed; pages hide empty values.
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    hours: "",
  },
  // TODO(client): set the production domain, also in NEXTAUTH_URL.
  url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  /** Shown on Terms and Privacy until counsel has reviewed them. */
  legalDraft: true,
};
