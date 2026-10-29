import { H2, StaticPage } from "@/components/StaticPage";
import { site } from "@/config/site";

export const metadata = { title: "Privacy and data protection" };

// Outline based on what the platform actually stores. Counsel must confirm the
// legal wording and Uganda data-protection registration before launch.
export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy and data protection" draft={site.legalDraft}>
      <H2>What we collect</H2>
      <ul className="list-disc pl-5">
        <li>Account details: name, email, phone (optional) and a securely hashed password.</li>
        <li>Membership and payment records: plan, status, payment method type and the payment provider&apos;s reference. We do not store card numbers or mobile-money PINs.</li>
        <li>For businesses: registration details, contacts, locations and verification documents you upload. Verification documents are private and only seen by editors.</li>
        <li>What you save: saved items, collections, saved searches and calculator results.</li>
        <li>Usage: searches and page views, linked to your account if you are signed in, to understand what information people need.</li>
        <li>Correction reports, including an email address if you give one.</li>
      </ul>
      <H2>How we use it</H2>
      <p>[To be completed: purposes, lawful basis, alerts and emails, retention periods.]</p>
      <H2>Who we share it with</H2>
      <p>[To be completed: payment provider, hosting, email provider. Member contact reveals are recorded so businesses can see interest.]</p>
      <H2>Your rights</H2>
      <p>[To be completed by counsel with reference to Uganda&apos;s data protection law: access, correction, deletion, complaints.]</p>
      <div id="cookies" className="scroll-mt-28"><H2>Cookies</H2></div>
      <p>We use only the cookies the site needs to work. There are no advertising or tracking cookies.</p>
      <ul className="list-disc pl-5">
        <li>Sign-in: keeps you signed in on this device and protects forms from being sent by another site.</li>
        <li>Cookie notice: remembers that you have seen this notice, so it is not shown again.</li>
        <li>Staff only: remembers the light or dark look of the admin area.</li>
        <li>Videos: the homepage video uses YouTube&apos;s privacy-enhanced mode, which does not set cookies until you play it.</li>
      </ul>
      <p>You can delete cookies in your browser settings at any time. If you delete the sign-in cookie, you will need to sign in again.</p>
      <H2>Contact</H2>
      <p>{site.contact.email ? <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> : "[Data protection contact to be confirmed]"}</p>
    </StaticPage>
  );
}
