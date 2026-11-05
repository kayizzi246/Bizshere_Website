import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";
import { PanelWords, SplitShell } from "@/components/SplitShell";

export const metadata = { title: "Create your account" };

// Sign-up and sign-in are the same with a phone number: a new number gets an account.
export default function SignupPage() {
  return (
    <SplitShell heading="Create your account" sub="Enter your phone number to get started."
      foot={<>Selling or advising? <Link href="/suppliers/join" className="font-bold">Become a Supplier</Link> or <Link href="/experts/join" className="font-bold">Become an Expert</Link></>}
      panel={<PanelWords lead="Start planning your business" accent="today" text="Search every directory, read previews of every plan, machine and fund, and save what you need." chips={["Business ideas", "Machines", "Suppliers", "Funding", "Market prices"]} />}>
      <PhoneAuthCard
        plain
        title="Create your account"
        googleEnabled={googleEnabled}
        // Straight on to the payment step of the onboarding pop-up, not a dead-end account page.
        redirectTo="/?onboard=pay&next=%2Fbusiness-ideas"
        footer={<p className="text-xs text-ink-muted">By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>}
      />
    </SplitShell>
  );
}
