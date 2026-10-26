# 06 Client information checklist

**For:** the client and project lead. Tracks the items in
`source/BizSphere-Ug_Client_Information_Request.pdf` and anything else the site still needs
from the client. Until each arrives, the site uses a clearly temporary placeholder.

## A. Brand (from the information request)

| No. | Item | What to send | Where it goes in the code | Received |
|---|---|---|---|---|
| A1 | Logo | Original (AI, EPS, SVG or PDF) + PNG with clear background; white version if available | `public/brand/`, `src/components/Logo.tsx` (currently a green "B" placeholder) | ☐ |
| A2 | Small icon | Square symbol, at least 512 px | `src/app/icon.png` and `src/app/apple-icon.png` | ☐ |
| A3 | Main colour | Colour code, e.g. #1D6B45 | `tailwind.config.ts` → `brand.DEFAULT` (placeholder is #1D6B45) | ☐ |
| A4 | Other colours | Secondary/accent codes | `tailwind.config.ts` → `brand.*` | ☐ |
| A5 | Fonts | Font names; web licence if bought | `src/app/layout.tsx`, `--font-sans` in `globals.css` (placeholder: Plus Jakarta Sans) | ☐ |
| A6 | Brand guide | Only if one exists | Shared with the designer | ☐ |
| A7 | Slogan and tone | Slogan; how formal or friendly | `src/config/site.ts` → `tagline` | ☐ |

When colours arrive, check text contrast (WCAG AA, at least 4.5:1) before switching.

## B. Also needed before launch

These aren't in the information request but the site can't launch without them.

| Item | Why | Where it goes | Received |
|---|---|---|---|
| Public contact details (email, phone, WhatsApp, address, hours) | Contact page and footer | `src/config/site.ts` → `contact` | ☐ |
| Domain name | Live address, sign-in links | `NEXTAUTH_URL` in hosting settings | ☐ |
| Membership plan prices (monthly, yearly) | Membership page shows "to be confirmed" until set | Admin, or `membership_plans` table | ☐ |
| Payment gateway account (MTN MoMo, Airtel Money, cards) | Taking payments | `.env` `PAYMENT_*`, `src/lib/payments.ts` | ☐ |
| Terms of use and privacy policy approved by a lawyer | Legal pages are marked "Draft" | `src/app/(site)/terms`, `privacy`; then set `legalDraft: false` in `site.ts` | ☐ |
| Data protection registration (Uganda) | Legal requirement for handling personal data; confirm with counsel | — | ☐ |
| Email sending account | Password resets, invites, alerts | To be added | ☐ |
| First real content: researched ideas, suppliers, funding, guides | Sample records must be replaced | Admin entry forms | ☐ |
