import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SideNav } from "@/components/SideNav";
import { getMyOrganization } from "@/lib/business";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { org } = await getMyOrganization();
  const plan = org.subscriptions[0]?.plan.name ?? "No plan";
  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-page">
      <aside className="flex max-w-full flex-[1_1_250px] flex-col gap-5 border-r border-line bg-white px-4 py-5">
        <div className="px-2"><Logo /></div>
        <div className="flex items-center gap-2.5 rounded-xl bg-page p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#DCE8DF] text-xs text-[#3E5A49]">Logo</span>
          <span className="flex min-w-0 flex-col"><span className="truncate text-sm font-extrabold">{org.tradingName ?? org.legalName}</span><span className="text-xs capitalize text-ink-muted">{org.accountType.toLowerCase().replace("_", " ")} · {plan}</span></span>
        </div>
        <SideNav items={[
          { href: "/business", label: "Overview" },
          { href: "/business/offers/new", label: "Add an offer" },
          { href: "/business#listings", label: "My listings" },
          { href: "/business#verification", label: "Verification" },
          { href: "/membership", label: "Plan and billing" },
        ]} />
        <Link href="/api/auth/signout" className="mt-auto px-3 text-sm font-semibold text-ink-muted">Sign out</Link>
      </aside>
      <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-6 px-8 pb-14 pt-7">{children}</main>
    </div>
  );
}
