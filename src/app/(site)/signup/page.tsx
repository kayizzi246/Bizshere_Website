import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";

export const metadata = { title: "Create your account" };

// Sign-up and sign-in are the same with a phone number: a new number gets an account.
export default function SignupPage() {
  return (
    <div className="container-site grid items-center gap-12 py-14 lg:grid-cols-2">
      <div className="hidden flex-col gap-6 lg:flex">
        <span className="eyebrow">Free account</span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Start planning your business today</h1>
        <ul className="flex flex-col gap-3 text-lg">
          {["Search every directory", "Read previews of every plan, machine and fund", "Save items into collections for your plan", "Upgrade any time to unlock full detail"].map((t) => (
            <li key={t} className="flex items-start gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand" />{t}</li>
          ))}
        </ul>
      </div>
      <PhoneAuthCard
        title="Create your free account"
        googleEnabled={googleEnabled}
        // Straight on to the payment step of the onboarding pop-up, not a dead-end account page.
        redirectTo="/?onboard=pay&next=%2Fbusiness-ideas"
        footer={<>
          <p className="text-xs text-ink-muted">By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
          <p className="border-t border-line pt-4 text-sm text-ink-muted">Selling machines, supplies or services? <Link href="/contact" className="font-bold">Contact our team</Link> to get listed.</p>
        </>}
      />
    </div>
  );
}
