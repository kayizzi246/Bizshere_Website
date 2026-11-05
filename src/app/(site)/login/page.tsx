import Link from "next/link";
import { googleEnabled } from "@/lib/auth";
import { PhoneAuthCard } from "@/components/PhoneAuthCard";
import { StaffSignIn } from "@/components/StaffSignIn";
import { PanelWords, SplitShell } from "@/components/SplitShell";
import { StaffShell } from "@/components/StaffShell";

export const metadata = { title: "Sign in" };

// Not linked from the menu: people stay signed in on their device. This is for a
// subscriber on a new phone or computer. Opening /admin while signed out lands here
// with callbackUrl=/admin…, and then it shows the staff email and password sign-in.
export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  // Only paths on this site: "//evil.com" and "/\evil.com" would leave it.
  const back = /^\/(?![/\\])/.test(searchParams.callbackUrl ?? "") ? searchParams.callbackUrl! : "/";
  if (back === "/admin" || back.startsWith("/admin/") || back.startsWith("/admin?")) {
    return (
      <StaffShell><StaffSignIn next={back} /></StaffShell>
    );
  }
  return (
    <SplitShell heading="Welcome back" sub="Enter the number you subscribed with."
      foot={<>Not a member yet? <Link href="/signup" className="font-bold">Create your account</Link></>}
      panel={<PanelWords lead="Pick up where you" accent="left off" text="Your plans, prices and saved items are waiting for you." chips={["Business ideas", "Market prices", "Suppliers", "Funding"]} />}>
      <PhoneAuthCard plain title="Get your access back" googleEnabled={googleEnabled} redirectTo={back} />
    </SplitShell>
  );
}
