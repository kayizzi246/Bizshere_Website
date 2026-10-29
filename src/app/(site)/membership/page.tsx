import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { Check } from "@/components/Gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membership" };

const FEATURES: Record<string, string[]> = {
  free: ["Search all directories", "Read previews of every page", "Save items and collections"],
  member: ["Full business plans and budgets", "Supplier and expert contacts", "Full funding terms and alerts", "Price history and downloads"],
};

export default async function MembershipPage({ searchParams }: { searchParams: { period?: string } }) {
  const yearly = searchParams.period === "yearly";
  const plans = await prisma.membershipPlan.findMany({ where: { isActive: true, audience: "MEMBER" }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="container-site flex flex-col items-center gap-8 py-16">
      <div className="flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="eyebrow">Membership</span>
        <h1 className="text-page-title">Everything you need to start, in one membership</h1>
        <p className="text-lg text-ink-soft">Browse previews for free. Subscribe to unlock full plans, contacts, funding terms, price history and downloads.</p>
        <div className="flex gap-1 rounded-xl bg-[#E9E7E4] p-1">
          <Link href="?period=monthly" className={`rounded-lg px-5 py-2.5 text-[15px] ${!yearly ? "bg-white font-bold text-heading" : "text-ink-soft"}`}>Monthly</Link>
          <Link href="?period=yearly" className={`rounded-lg px-5 py-2.5 text-[15px] ${yearly ? "bg-white font-bold text-heading" : "text-ink-soft"}`}>Yearly</Link>
        </div>
      </div>
      <div className="flex w-full flex-wrap justify-center gap-5">
        {plans.map((p) => {
          const featured = p.code === "member";
          const price = yearly ? p.priceYearly : p.priceMonthly;
          return (
            <div key={p.id} className={`flex flex-[1_1_320px] max-w-md flex-col gap-4 rounded-[20px] p-8 ${featured ? "bg-ink text-white" : "card"}`}>
              <span className="text-lg font-bold">{p.name}</span>
              <span className="text-3xl font-bold">{money(price, p.currency, "Price coming soon")}{price !== null && Number(price) > 0 ? <span className="ml-1 text-base font-normal opacity-80">{yearly ? "per year" : "per month"}</span> : null}</span>
              <Link href={p.code === "free" ? "/signup" :`/membership/checkout?plan=${p.code}&period=${yearly ? "yearly" : "monthly"}`} className={featured ? "btn min-h-[50px] bg-white font-bold text-heading hover:text-heading" : "btn-outline min-h-[50px]"}>
                {p.code === "free" ? "Create free account" : "Subscribe"}
              </Link>
              <ul className="flex flex-col gap-3 text-[15px]">
                {(FEATURES[p.code] ?? []).map((f) => <li key={f} className="flex gap-2.5"><Check /> {f}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="card flex w-full flex-wrap items-center justify-between gap-6 px-8 py-7">
        <div className="flex flex-col gap-1"><span className="text-lg font-bold">Pay the way that suits you</span><span className="text-ink-muted">Mobile money or card. Cancel any time from your account.</span></div>
        <div className="flex flex-wrap gap-2.5">{["MTN Mobile Money", "Airtel Money", "Visa / Mastercard"].map((m) => <span key={m} className="rounded-[10px] border border-line-strong px-4 py-2.5 text-sm font-bold">{m}</span>)}</div>
      </div>
      <p className="text-sm text-ink-muted">Want your business listed? <Link href="/contact" className="font-bold">Contact our team</Link>.</p>
    </div>
  );
}
