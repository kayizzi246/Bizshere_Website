import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";
import { StaffSignIn } from "@/components/StaffSignIn";

export const metadata = { title: "Sign in" };

// Not linked from the menu: people stay signed in on their device. This is for a
// subscriber on a new phone or computer. Opening /admin while signed out lands here
// with callbackUrl=/admin…, and then it shows the staff email and password sign-in.
export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  const back = searchParams.callbackUrl?.startsWith("/") && !searchParams.callbackUrl.startsWith("//") ? searchParams.callbackUrl : "/";
  if (back === "/admin" || back.startsWith("/admin/") || back.startsWith("/admin?")) {
    return (
      <div className="container-site flex justify-center py-16">
        <StaffSignIn next={back} />
      </div>
    );
  }
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
