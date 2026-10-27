import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const back = searchParams.callbackUrl?.startsWith("/") ? searchParams.callbackUrl : "/";
  return (
    <div className="container-site flex justify-center py-16">
      <PhoneAuthCard
        title="Sign in"
        googleEnabled={googleEnabled}
        redirectTo={back}
        allowEmail
        footer={<p className="text-sm text-ink-muted">Want your business listed? <Link href="/contact" className="font-bold">Contact our team</Link></p>}
      />
    </div>
  );
}
