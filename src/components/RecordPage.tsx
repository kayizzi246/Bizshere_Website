import Link from "next/link";
import { BadgeCheck, Globe, LockKeyhole, Mail, Phone } from "lucide-react";
import type { ContentType } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cachedMemberPlan } from "@/lib/cached";
import { date, money } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Connected, Evidence } from "./DetailParts";
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
  const plan = await cachedMemberPlan();
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
      {/* ── 1–2. Identity and key facts: a deep navy band like the homepage hero. Title and
          access on the left; the photo (or, without one, the key facts) on the right. ── */}
      <header className="bg-[#071A33] text-white">
        <div className="container-site flex flex-col gap-7 py-8 lg:py-12">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/60">
            <Link href="/" className="text-white/60 hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <Link href={trail[0]} className="text-white/60 hover:text-white">{trail[1]}</Link>
            <span aria-hidden>/</span>
            <span className="max-w-[32ch] truncate text-white/90">{title}</span>
          </nav>

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-8 lg:items-center lg:gap-12 ${picture ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}>
            <div className="flex min-w-0 flex-col gap-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] py-1 pl-1.5 pr-3 text-xs font-semibold text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink"><Icon name={icon} className="h-3 w-3" /></span>
                {eyebrow}
              </span>
              <h1 className="font-sans text-[32px] font-black leading-[1.08] tracking-[-0.02em] sm:text-[44px]">{title}</h1>
              {brief ? <p className="max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{brief}</p> : null}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-white/80"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Reviewed {date(item.lastReviewedAt)}</span>
                <span className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-[11px] text-white/60">{ref}</span>
                {viewer.isMember ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 font-bold text-ink"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span>
                ) : null}
              </div>
              {locked ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={back} data-onboard="" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-ink hover:bg-accent hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock full details</Link>
                  <span className="text-xs text-white/60">{planInfo.monthly ? `${planInfo.monthly} a month · ` : ""}MoMo, Airtel Money or card</span>
                </div>
              ) : null}
            </div>

            {picture ? (
              <figure className="flex flex-col gap-2">
                {/* External image URLs entered by editors; no Next image domain list to maintain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={picture} alt={title} className="aspect-[4/3] w-full rounded-3xl border border-white/10 bg-white/5 object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]" />
                {pictureCredit ? <figcaption className="text-xs text-white/50">{pictureCredit}</figcaption> : null}
              </figure>
            ) : rows.length ? <Facts rows={rows} unlock={unlock} /> : null}
          </div>
        </div>
      </header>

      {/* Section tabs: stay under the site header while reading */}
      <nav aria-label="On this page" className="sticky top-[78px] z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="container-site flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {tabs.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-page hover:text-heading">{label}</a>
          ))}
        </div>
      </nav>

      <div className="bg-page"><div className="container-site grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:py-10">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ── 3. Practical detail ── */}
          {shownTexts.length || children ? (
            <section id="overview" className="flex scroll-mt-36 flex-col gap-4">
              {shownTexts.map((t) => (
                <div key={t.label} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-6">
                  <h2 className="font-sans text-xl font-black tracking-[-0.01em] text-heading">{t.label}</h2>
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
          {picture && rows.length ? <Facts rows={rows} unlock={unlock} /> : null}
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
            <section id="contact" className="flex scroll-mt-36 flex-col gap-4 rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-sans text-lg font-black text-heading">Contact</h2>
                {contact === "locked" ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-accent-dark"><LockKeyhole aria-hidden className="h-3 w-3" />Members</span> : null}
              </div>
              {contact === "locked" ? (
                <>
                  {/* Placeholder rows, blurred: no real contact detail is sent to visitors */}
                  <div aria-hidden className="flex flex-col gap-2">
                    <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value="name@example.co.ug" blurred />
                    <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value="+256 7•• ••• •••" blurred />
                  </div>
                  <Link href={back} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock contact details</Link>
                </>
              ) : contact.email || contact.phone || contact.website ? (
                <>
                  <div className="flex flex-col gap-2">
                    {contact.phone ? <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} href={`tel:${contact.phone.replace(/\s/g, "")}`} /> : null}
                    {contact.email ? <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} href={`mailto:${contact.email}`} /> : null}
                    {contact.website ? <ContactRow icon={<Globe className="h-4 w-4" />} label="Website" value={contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} href={contact.website} external /> : null}
                  </div>
                  <p className="text-xs leading-relaxed text-ink-muted">Say you found them on BizSphere-Ug. Agree prices and terms in writing before you pay.</p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Contact details not added yet.</p>
              )}
            </section>
          ) : null}

          {shownLinks.length ? (
            <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-6">
              <h2 className="mb-0.5 font-display text-sm font-bold text-heading">Useful links</h2>
              {/* Same pill buttons as the download card, full width and thumb-sized on phones */}
              {shownLinks.map((l) =>
                l.locked ? (
                  <Link key={l.label} href={back} data-onboard="" className="flex h-12 items-center justify-between gap-3 rounded-[10px] border border-line pl-4 pr-3 text-sm font-semibold text-ink hover:border-brand hover:text-ink">
                    <span className="inline-flex items-center gap-2.5"><LockKeyhole aria-hidden className="h-4 w-4 text-ink-muted" />{l.label}</span>
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Members</span>
                  </Link>
                ) : (
                  <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="group flex h-12 items-center justify-between gap-3 rounded-[10px] border border-line pl-4 pr-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
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
          <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{productFormat(product)} · {product.kind}</span>
                <span className="truncate text-[13px] font-semibold text-heading">{product.title}</span>
              </span>
              <span className="w-44 shrink-0"><ProductAction product={product} back={back} className="h-11" /></span>
            </div>
          </div>
        </>
      ) : contact !== undefined && (contact === "locked" || contact.phone || contact.email) ? (
        // Phones: getting in touch stays one tap away at the bottom of the screen.
        <>
          <div aria-hidden className="h-24 lg:hidden" />
          <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-20px_rgba(7,26,51,0.35)] backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Contact</span>
                <span className="truncate text-[13px] font-semibold text-heading">{title}</span>
              </span>
              {contact === "locked" ? (
                <Link href={back} data-onboard="" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock contact</Link>
              ) : (
                <span className="flex shrink-0 gap-2">
                  {contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Call</a> : null}
                  {contact.email ? <a href={`mailto:${contact.email}`} aria-label="Email" className={`inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong text-sm font-bold text-heading hover:border-brand hover:text-brand ${contact.phone ? "w-11 justify-center" : "px-4"}`}><Mail aria-hidden className="h-4 w-4" />{contact.phone ? null : "Email"}</a> : null}
                </span>
              )}
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
    <div className="flex flex-col rounded-2xl border border-line bg-white p-6 text-ink shadow-[0_20px_50px_-24px_rgba(7,26,51,0.45)]">
      <span className="mb-2 font-sans text-base font-black text-heading">At a glance</span>
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

/** One way to get in touch: icon tile, label and value; the whole row is the link. */
function ContactRow({ icon, label, value, href, external, blurred }: { icon: React.ReactNode; label: string; value: string; href?: string; external?: boolean; blurred?: boolean }) {
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-medium text-ink-muted">{label}</span>
        <span className={`truncate text-sm font-semibold text-heading ${blurred ? "select-none blur-[5px]" : ""}`}>{value}</span>
      </span>
      {href ? <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span> : null}
    </>
  );
  const cls = "group flex items-center gap-3 rounded-xl border border-line p-3 text-ink";
  return href ? (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${cls} hover:border-brand hover:text-ink`}>{body}</a>
  ) : <div className={cls}>{body}</div>;
}

/** Small helpers pages use to format field values. */
export const list = (xs?: string[] | null) => (xs && xs.length ? xs.join(", ") : null);
export const titleCase = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);
/** An outside link shown as its address, or null (so the row reads "Not added yet"). */
export const extLink = (href?: string | null) =>
  href ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">{href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : null;
