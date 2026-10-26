import Link from "next/link";
import { H2, StaticPage } from "@/components/StaticPage";
import { site } from "@/config/site";

export const metadata = { title: "Terms of use" };

// Outline only. Wording must be written or approved by the client's lawyer before launch.
export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" draft={site.legalDraft}>
      <H2>1. About these terms</H2>
      <p>These terms apply to everyone who uses {site.name}, including visitors, members and businesses with listings.</p>
      <H2>2. Information, not advice</H2>
      <p>Content on {site.name} is general business information. It is not legal, tax, financial or investment advice. Check details with the provider or a qualified adviser before you act. See our <Link href="/methodology">content methodology</Link>.</p>
      <H2>3. Accounts and membership</H2>
      <p>[To be completed: account responsibilities, membership plans, billing periods, renewals, cancellations and refunds.]</p>
      <H2>4. Business listings</H2>
      <p>[To be completed: accuracy obligations for businesses, editorial review, removal of listings, paid listing terms.]</p>
      <H2>5. Acceptable use</H2>
      <p>[To be completed: no scraping or resale of member content, no misleading submissions.]</p>
      <H2>6. Liability</H2>
      <p>[To be completed by counsel.]</p>
      <H2>7. Governing law</H2>
      <p>[To be completed by counsel.]</p>
    </StaticPage>
  );
}
