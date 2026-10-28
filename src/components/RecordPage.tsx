import Link from "next/link";
import { BadgeCheck, LockKeyhole } from "lucide-react";
import type { ContentType } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Connected, Crumbs, Evidence } from "./DetailParts";
import { FieldSections, visibleGroups } from "./FieldSections";
import { ChildSections, loadChildSections } from "./ChildSections";
import { Icon } from "./Icon";
import { ProductAction, ProductCard, productFormat, type Product } from "./ProductCard";
import { OnboardingGate } from "./Onboarding";

/**
 * One layout for every directory detail page, following the blueprint's detail-page order:
 * identity, key facts, practical detail, evidence, action, connected resources.
 *
 * Gating happens before this component: a page passes `locked: true` and NO value
 * for anything a visitor may not see, and `details.gated` so FieldSections locks
 * member fields itself. Every "Unlock" opens the onboarding pop-up (sign in → pay).
 */
export type DetailRow = { label: string; value?: React.ReactNode; locked?: boolean };
export type TextBlock = { label: string; text?: string | null; locked?: boolean };
export type LinkItem = { label: string; href?: string | null; locked?: boolean; icon?: string };
export type ContactInfo = { email?: string | null; phone?: string | null; website?: string | null };

const empty = (v: React.ReactNode) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

export async function RecordPage({
  trail, eyebrow, title, brief, picture, pictureCredit, rows, texts = [], links = [], contact, children, viewer, item, back, details, product,
}: {
  trail: [string, string];
  eyebrow: string;
  title: string;
  brief?: string | null;
  /** Main photo URL, if the record has one. */
  picture?: string | null;
  /** Photographer and licence, shown under the photo. */
  pictureCredit?: string | null;
  /** Key facts: the client's main fields for this directory. */
  rows: DetailRow[];
  texts?: TextBlock[];
  links?: LinkItem[];
  /** `"locked"` for visitors: email and phone are not sent at all. */
  contact?: ContactInfo | "locked";
  children?: React.ReactNode;
  viewer: Viewer;
  item: { id: string; lastReviewedAt: Date | null; nextReviewDueAt: Date | null };
  back: string;
  /** Every other field group of the specialised record, rendered from the admin field list. */
  details?: { type: ContentType; record: Record<string, unknown>; gated: boolean; skip?: string[] };
  /** A downloadable guide, book, template or tool: shown as a digital product card at the top of the sidebar. */
  product?: Product;
  /** Kept for older callers. */
  gateTitle?: string;
}) {
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" } });
  const planInfo = {
    name: plan?.name ?? "Member",
    monthly: plan?.priceMonthly != null ? money(plan.priceMonthly, plan.currency) : null,
    yearly: plan?.priceYearly != null ? money(plan.priceYearly, plan.currency) : null,
  };

  const icon = DIRECTORIES.find((d) => d.href === trail[0])?.icon ?? "link";
  const ref = `BSU-${item.id.slice(-6).toUpperCase()}`;
  const lockedLabels = [
    ...rows.filter((r) => r.locked).map((r) => r.label),
    ...texts.filter((t) => t.locked).map((t) => t.label),
    ...links.filter((l) => l.locked).map((l) => l.label),
    ...(contact === "locked" ? ["Contact details"] : []),
  ];
  const locked = !viewer.isMember && (lockedLabels.length > 0 || Boolean(details?.gated));
  const shownTexts = texts.filter((t) => t.locked || t.text);
  const shownLinks = links.filter((l) => l.locked || l.href);
  // Offers, listings, rounds, fees, services and the rest (src/lib/child-tables.ts).
  const sections = details && details.record.id
    ? await loadChildSections(details.type, { record: String(details.record.id), item: item.id, org: typeof details.record.organizationId === "string" && details.type === "SUPPLIER" ? details.record.organizationId : null })
    : [];
  const hasDetails = details ? visibleGroups(details.type, details.record, details.skip).length > 0 : false;
  const tabs: [string, string][] = [
    ...(shownTexts.length || children ? [["overview", "Overview"] as [string, string]] : []),
    ...sections.filter((x) => x.table.layout !== "gallery").map((x) => [`c-${x.table.key}`, x.table.label] as [string, string]),
    ...(hasDetails ? [["details", "Full details"] as [string, string]] : []),
    ...sections.filter((x) => x.table.layout === "gallery").map((x) => [`c-${x.table.key}`, x.table.label] as [string, string]),
    ["evidence", "Sources and checks"],
    ["related", "Related"],
  ];
  const unlock = (label = "Unlock", cls = "") => (
    <Link href={back} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}>
      <LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}
    </Link>
  );

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
      {/* ── 1–2. Identity and key facts ── */}
      <div className="relative overflow-hidden border-b border-line bg-white">
        {/* Soft brand glow, top right */}
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-brand-tint blur-3xl" />
        <div className="container-site relative flex flex-col gap-7 py-8 lg:py-12">
          <Crumbs trail={[trail]} title={title} />
          <header className={`grid gap-8 lg:items-start ${picture ? "lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"}`}>
            {picture ? (
              <figure className="flex flex-col gap-2">
                {/* External image URLs entered by editors; no Next image domain list to maintain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={picture} alt={title} className="aspect-[4/3] w-full rounded-2xl border border-line bg-page object-cover" />
                {pictureCredit ? <figcaption className="text-xs text-ink-muted">{pictureCredit}</figcaption> : null}
              </figure>
            ) : null}

            <div className="flex min-w-0 flex-col gap-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-tint py-1 pl-1.5 pr-3 text-xs font-semibold text-brand-dark">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand"><Icon name={icon} className="h-3 w-3" /></span>
                {eyebrow}
              </span>
              <h1 className="font-sans text-[30px] font-black leading-[1.08] tracking-[-0.03em] text-brand-deep sm:text-[38px]">{title}</h1>
              {brief ? <p className="max-w-2xl text-base leading-relaxed text-ink-soft">{brief}</p> : null}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-ink-soft"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />Reviewed {date(item.lastReviewedAt)}</span>
                <span className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[11px] text-ink-muted">{ref}</span>
                {viewer.isMember ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 font-semibold text-white"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span>
                ) : locked ? (
                  <Link href={back} data-onboard="" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-semibold text-ink hover:bg-brand-deep hover:text-white"><LockKeyhole aria-hidden className="h-3 w-3" />Unlock full details</Link>
                ) : null}
              </div>
              {picture && rows.length ? <Facts rows={rows} unlock={unlock} /> : null}
            </div>

            {!picture && rows.length ? <Facts rows={rows} unlock={unlock} /> : null}
          </header>
        </div>
      </div>

      {/* Section tabs: one pill bar that stays under the header */}
      <nav aria-label="On this page" className="sticky top-[68px] z-30 border-b border-line bg-white/80 backdrop-blur-xl">
        <div className="container-site overflow-x-auto py-2.5 [scrollbar-width:none]">
          <div className="inline-flex gap-0.5 rounded-full border border-line bg-page p-1">
            {tabs.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-white hover:text-brand-deep">{label}</a>
            ))}
          </div>
        </div>
      </nav>

      <div className="bg-page"><div className="container-site grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ── 3. Practical detail ── */}
          {shownTexts.length || children ? (
            <section id="overview" className="flex scroll-mt-36 flex-col gap-4">
              {shownTexts.map((t) => (
                <div key={t.label} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-6">
                  <h2 className="text-base font-extrabold text-brand-deep">{t.label}</h2>
                  {t.locked ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-page p-4 text-sm text-ink-muted">
                      <span>The {t.label.toLowerCase()} is for members.</span>{unlock("Unlock")}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{t.text}</p>
                  )}
                </div>
              ))}
              {children}
            </section>
          ) : null}

          <ChildSections sections={sections.filter((x) => x.table.layout !== "gallery")} gated={Boolean(details?.gated) && !viewer.isMember} back={back} />

          {details ? <FieldSections type={details.type} record={details.record} gated={details.gated && !viewer.isMember} skip={details.skip} back={back} /> : null}

          <ChildSections sections={sections.filter((x) => x.table.layout === "gallery")} gated={Boolean(details?.gated) && !viewer.isMember} back={back} />

          {/* ── 4. Evidence ── */}
          <div id="evidence" className="scroll-mt-36">
            <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={back} />
          </div>
        </div>

        {/* ── 5–6. Action and connected resources ──
            On phones the aside dissolves (display: contents): the actions move up under the
            header, and connected resources stay at the end. */}
        <aside className="contents lg:sticky lg:top-36 lg:flex lg:flex-col lg:gap-4 lg:self-start">
          <div className="order-first flex flex-col gap-4 lg:order-none">
          {product ? <ProductCard product={product} back={back} price={planInfo.monthly} /> : null}

          {locked && !product ? (
            <section className="flex flex-col gap-3 rounded-2xl bg-brand-deep p-6 text-white">
              <span className="font-display text-base font-extrabold">See the full listing</span>
              <p className="text-[13px] leading-relaxed text-white/75">
                {lockedLabels.length ? `Members see ${lockedLabels.join(", ").toLowerCase()} and every other detail.` : "Members see prices, contacts, terms and downloads."}
              </p>
              <Link href={back} data-onboard="" className="btn bg-accent text-ink hover:bg-white hover:text-ink">Unlock full access</Link>
              <p className="text-xs text-white/60">{planInfo.monthly ? `${planInfo.monthly} a month · ` : ""}MTN MoMo, Airtel Money or card</p>
            </section>
          ) : null}

          {contact !== undefined ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-sm font-bold text-brand-deep">Contact</h2>
              {contact === "locked" ? (
                <div className="flex flex-col gap-2 text-sm text-ink-muted">
                  <span>Email and phone are shown to members.</span>
                  {unlock("Unlock contact details", "text-sm")}
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-sm">
                  <ContactLine label="Email" value={contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null} />
                  <ContactLine label="Phone" value={contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a> : null} />
                </div>
              )}
            </section>
          ) : null}

          {shownLinks.length ? (
            <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-0.5 font-display text-sm font-bold text-brand-deep">Useful links</h2>
              {/* Same pill buttons as the download card, full width and thumb-sized on phones */}
              {shownLinks.map((l) =>
                l.locked ? (
                  <Link key={l.label} href={back} data-onboard="" className="flex h-12 items-center justify-between gap-3 rounded-full border border-line pl-4 pr-3 text-sm font-semibold text-ink hover:border-brand hover:text-ink">
                    <span className="inline-flex items-center gap-2.5"><LockKeyhole aria-hidden className="h-4 w-4 text-ink-muted" />{l.label}</span>
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Members</span>
                  </Link>
                ) : (
                  <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="group flex h-12 items-center justify-between gap-3 rounded-full border border-line pl-4 pr-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
                    <span className="inline-flex min-w-0 items-center gap-2.5"><Icon name={l.icon ?? "link"} className="h-4 w-4 shrink-0 text-brand" /><span className="truncate">{l.label}</span></span>
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-page text-ink-muted transition group-hover:bg-brand group-hover:text-white">↗</span>
                  </a>
                ),
              )}
            </section>
          ) : null}
          </div>

          <div id="related" className="scroll-mt-36">
            <Connected contentItemId={item.id} />
          </div>
        </aside>
      </div></div>

      {/* Phones: the download stays one tap away at the bottom of the screen */}
      {product && (product.href || product.locked) ? (
        <>
          <div aria-hidden className="h-20 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{productFormat(product)} · {product.kind}</span>
                <span className="truncate text-[13px] font-semibold text-brand-deep">{product.title}</span>
              </span>
              <span className="w-44 shrink-0"><ProductAction product={product} back={back} className="h-11" /></span>
            </div>
          </div>
        </>
      ) : null}
    </OnboardingGate>
  );
}

/** "At a glance": the client's main fields as label/value rows. */
function Facts({ rows, unlock }: { rows: DetailRow[]; unlock: (label?: string, cls?: string) => React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white/80 p-5 backdrop-blur">
      <span className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">At a glance</span>
      <dl className="flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-6 py-3">
            <dt className="shrink-0 text-[13px] text-ink-muted">{r.label}</dt>
            <dd className="min-w-0 text-right text-[13px] font-semibold leading-snug text-ink">
              {r.locked ? unlock("Members only", "text-[13px]") : empty(r.value) ? <span className="font-normal text-ink-muted">Not added yet</span> : r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ContactLine({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
      <span className="text-ink-muted">{label}</span>
      {value ? <span className="font-semibold">{value}</span> : <span className="text-ink-muted">Not added yet</span>}
    </div>
  );
}

/** Small helpers pages use to format field values. */
export const list = (xs?: string[] | null) => (xs && xs.length ? xs.join(", ") : null);
export const titleCase = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);
/** An outside link shown as its address, or null (so the row reads "Not added yet"). */
export const extLink = (href?: string | null) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">{href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : null;
