import Link from "next/link";
import { ArrowRight, BadgePercent, CalendarCheck2, Factory, Lightbulb, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { publicOffer } from "@/lib/promos";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { date } from "@/lib/format";
import { LeadForm } from "./LeadForm";

/**
 * The three things on the homepage whose job is to turn a visitor into a member. Each one shows
 * only real, checked facts: a discount the team is actually running, counts straight out of the
 * database, and a form that puts a person on the phone.
 *
 * Nothing member-only is used here. The counts say how much there is, never what any of it costs,
 * so no budget, price or contact leaks to someone who hasn't paid.
 */

/**
 * The live offer band. It appears only while the team has a code ticked "show on the site" in
 * Admin > Offers and codes, and it is a one-tap offer: the code goes to the payment pop-up with
 * the link (data-code), which fills it in and shows the lower price before anything is paid.
 * Members never see it.
 */
export async function OfferBand() {
  const [viewer, offer] = await Promise.all([getViewer(), publicOffer()]);
  if (!offer || viewer.isMember) return null;
  return (
    <aside className="container-site py-3 sm:py-4">
      <Link
        href={`/membership?onboard=pay&next=%2Fbusiness-ideas`}
        data-pay=""
        data-next="/business-ideas"
        data-code={offer.code}
        className="card-premium group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-accent/35 bg-accent-tint px-4 py-3.5 text-ink hover:text-ink sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-ink"><BadgePercent aria-hidden className="h-[18px] w-[18px]" /></span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-[15px] font-bold leading-tight text-heading">{offer.headline}</span>
            <span className="text-[13px] text-ink-muted">Use code <strong className="font-mono font-bold tracking-wide text-heading">{offer.code}</strong> — we fill it in for you.</span>
          </span>
        </span>
        <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-navy px-4 text-[14px] font-bold text-white group-hover:bg-brand-dark">
          Get the discount<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>
    </aside>
  );
}

/**
 * What is actually in here, counted in the database, with the date of the newest market price.
 * Someone deciding whether this is worth paying for wants to know there is enough of it and that
 * it is kept up to date; these are the two questions a number can answer honestly.
 */
export async function TrustBand() {
  const live = { publicationStatus: "PUBLISHED" } as const;
  const [ideas, suppliers, machines, latestPrice, markets] = await Promise.all([
    prisma.contentItem.count({ where: { contentType: "BUSINESS_IDEA", ...live } }),
    prisma.contentItem.count({ where: { contentType: "SUPPLIER", ...live } }),
    prisma.contentItem.count({ where: { contentType: "MACHINE", ...live } }),
    prisma.priceObservation.findFirst({ where: { status: "PUBLISHED" }, orderBy: { observedAt: "desc" }, select: { observedAt: true } }),
    prisma.priceObservation.findMany({ where: { status: "PUBLISHED" }, select: { marketId: true }, distinct: ["marketId"] }),
  ]).catch(() => [0, 0, 0, null, []] as const);

  // A directory with nothing in it is left out rather than shown as a zero.
  const cells = [
    ideas ? { icon: Lightbulb, n: ideas, label: ideas === 1 ? "business idea, with its budget" : "business ideas, with their budgets", href: "/business-ideas" } : null,
    suppliers ? { icon: Store, n: suppliers, label: suppliers === 1 ? "checked supplier" : "checked suppliers", href: "/suppliers" } : null,
    machines ? { icon: Factory, n: machines, label: machines === 1 ? "machine, priced" : "machines, priced", href: "/machines" } : null,
    markets.length ? { icon: CalendarCheck2, n: markets.length, label: markets.length === 1 ? "market on the price board" : "markets on the price board", href: "/prices" } : null,
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (cells.length < 2) return null;

  return (
    <section aria-label="What is on BizSphere-Ug" className="container-site py-6 sm:py-8">
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {cells.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="card-premium flex h-full items-center gap-3 px-4 py-4 text-ink hover:text-ink">
              <c.icon aria-hidden className="h-5 w-5 shrink-0 text-brand" />
              <span className="flex min-w-0 flex-col">
                <span className="nums font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-heading">{c.n}</span>
                <span className="text-[12.5px] leading-snug text-ink-muted">{c.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {latestPrice ? (
        <p className="mt-2.5 text-center text-[12.5px] text-ink-muted">Prices last updated {date(latestPrice.observedAt)}. Every figure carries its date and where it came from.</p>
      ) : null}
    </section>
  );
}

/**
 * "Leave your number and we'll call you", on the homepage itself. Plenty of people here would
 * rather talk to someone than type card details, and the lead lands in Admin > Leads for the team
 * to ring back. Members don't see it; they already pay.
 */
export async function CallBack() {
  const [viewer, contact] = await Promise.all([getViewer(), getContact()]);
  if (viewer.isMember) return null;
  return (
    <section className="bg-page py-10 sm:py-14">
      <div className="container-site grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="text-section-title text-heading">Not sure where to start?</h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-ink-muted">
            Tell us the business you have in mind and we will point you to the budget, the machines and the people who sell them.
            Leave your number and we call you back, usually within the hour during working hours.
            {contact.whatsapp ? " Or send us a WhatsApp message now." : ""}
          </p>
          <p className="text-[14px] font-semibold text-heading">
            Ready already? <Link href="/membership" className="text-brand hover:text-brand-dark">See what a membership costs</Link>
          </p>
        </div>
        <LeadForm compact interest="question" whatsapp={contact.whatsapp ? whatsappHref(contact.whatsapp, "Hello BizSphere-Ug, I would like help getting started.") : null} />
      </div>
    </section>
  );
}
