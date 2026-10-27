import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";

export const metadata = { title: "Get your access back" };

// Not linked from the menu: people stay signed in on their device. This is for a
// subscriber on a new phone or computer. Staff sign in at their private link instead.
export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const back = searchParams.callbackUrl?.startsWith("/") ? searchParams.callbackUrl : "/";
  return (
    <div className="container-site flex justify-center py-16">
      <PhoneAuthCard
        title="Get your access back"
        googleEnabled={googleEnabled}
        redirectTo={back}
        footer={<p className="text-sm text-ink-muted">Enter the number you subscribed with. Not a member yet? <Link href="/signup" className="font-bold">Get started free</Link></p>}
      />
    </div>
  );
}
