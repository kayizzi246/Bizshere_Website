import Link from "next/link";
import { ArrowLeft, BadgeCheck, Globe, LockKeyhole, Mail, Phone } from "lucide-react";
import type { ContentType } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cachedMemberPlan } from "@/lib/cached";
import { date, money } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Connected, Evidence } from "./DetailParts";
import { FieldSections, fieldCount, visibleGroups } from "./FieldSections";
import { Expand, ReadMore, RecentStrip, RememberVisit } from "./Recent";
import { ChildSections, loadChildSections } from "./ChildSections";
import { Icon } from "./Icon";
import { ProductAction, ProductCard, productFormat, type Product } from "./ProductCard";
import { OnboardingGate } from "./Onboarding";
import { ProductGallery, type GalleryImage, type GalleryVideo } from "./ProductGallery";
import { videoId } from "@/lib/youtube";
import { WishlistButton } from "./Wishlist";

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
  trail, eyebrow, title, brief, picture, pictureCredit, rows, texts = [], links = [], contact, children, viewer, item, back, details, product, layout = "default", catalog, catalogLabel = "Products", hideSections = [],
}: {
  /** "product": shop-style page (gallery, price, where to buy, then specifications), used for machines. */
  layout?: "default" | "product";
  /** Full-width block under the section tabs, e.g. a supplier's product catalog (gets a "Products" tab). */
  catalog?: React.ReactNode;
  /** The tab name for `catalog`. */
  catalogLabel?: string;
  /** Child sections to leave out because `catalog` already shows them (e.g. "listings"). */
  hideSections?: string[];
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
    daily: plan?.priceDaily != null ? money(plan.priceDaily, plan.currency) : null,
    monthly: plan?.priceMonthly != null ? money(plan.priceMonthly, plan.currency) : null,
    yearly: plan?.priceYearly != null ? money(plan.priceYearly, plan.currency) : null,
  };

  const icon = DIRECTORIES.find((d) => d.href === trail[0])?.icon ?? "link";
  // Empty facts are left out: "Not added yet" rows are just more to read.
  const shownRows = rows.filter((r) => r.locked || !empty(r.value));
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
  const sections = (details && details.record.id
    ? await loadChildSections(details.type, { record: String(details.record.id), item: item.id, org: typeof details.record.organizationId === "string" && details.type === "SUPPLIER" ? details.record.organizationId : null })
    : []).filter((x) => !hideSections.includes(x.table.key));
  const detailCount = details ? fieldCount(visibleGroups(details.type, details.record, details.skip)) : 0;
  const tabs: [string, string][] = [
    ...(catalog ? [["catalog", catalogLabel] as [string, string]] : []),
    ...(shownTexts.length || children ? [["overview", "About"] as [string, string]] : []),
    ...sections.filter((x) => x.table.layout !== "gallery").map((x) => [`c-${x.table.key}`, x.table.label] as [string, string]),
    ...(detailCount ? [["details", "All details"] as [string, string]] : []),
    ...sections.filter((x) => x.table.layout === "gallery").map((x) => [`c-${x.table.key}`, x.table.label] as [string, string]),
    ["evidence", "Checks"],
    ["related", "Related"],
  ];
  const bar = product && (product.href || product.locked) ? "product"
    : contact !== undefined && (contact === "locked" || contact.phone || contact.email) ? "contact"
    : locked ? "unlock" : null;
  const unlock = (label = "Unlock", cls = "") => (
    <Link href={back} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}>
      <LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}
    </Link>
  );

  if (layout === "product") {
    // ── Shop-style product page: photo gallery on the left; details on the right (price, key facts,
    //    actions, then where to buy); the full specifications follow as you scroll. ──
    const priceRow = rows.find((r) => r.label === "Price");
    const whereRow = rows.find((r) => r.label === "Source");
    const facts = shownRows.filter((r) => r !== priceRow && r !== whereRow);
    const media = await prisma.mediaAsset.findMany({
      where: { contentItemId: item.id, mediaType: "image", ...(viewer.isMember ? {} : { accessLevel: "PUBLIC" as const }) },
      orderBy: { displayOrder: "asc" },
    });
    const images: GalleryImage[] = [
      ...(picture ? [{ src: picture, alt: title, credit: pictureCredit }] : []),
      ...media.map((m) => ({ src: m.fileLocation, alt: m.altText || m.caption || title, credit: m.credit })),
    ];
    // Videos play inside the gallery: YouTube links in its player, video files with the browser controls.
    const videos: GalleryVideo[] = shownLinks.filter((l) => !l.locked && l.href && l.icon === "video").map((l) => ({ label: l.label, href: l.href!, youtubeId: videoId(l.href!) }));
    const otherLinks = shownLinks.filter((l) => !(l.icon === "video" && l.href && !l.locked));
    const listSections = sections.filter((x) => x.table.layout !== "gallery");
    const productTabs: [string, string][] = [
      ...(catalog ? [["catalog", catalogLabel] as [string, string]] : []),
      ...((details && detailCount) || facts.length ? [["specs", "Specifications"] as [string, string]] : []),
      ...(shownTexts.length || children ? [["overview", "Description"] as [string, string]] : []),
      ...listSections.map((x) => [`c-${x.table.key}`, x.table.label] as [string, string]),
      ["related", "Related"],
    ];
    const hasContact = contact !== undefined && (contact === "locked" || contact.phone || contact.email || contact.website);
    const name = title.replace(/^Sample:\s*/i, "");

    return (
      <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
        <section className="bg-white">
          <div className="container-site flex flex-col gap-3 py-3 sm:gap-4 sm:py-5">
            <Link href={trail[0]} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand">
              <ArrowLeft aria-hidden className="h-4 w-4" />All {trail[1].toLowerCase()}
            </Link>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-8">
              {/* Details */}
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-dark">
                    <Icon name={icon} className="h-3.5 w-3.5" />{eyebrow}
                  </span>
                  <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[36px]">{name}</h1>
                  {brief ? <p className="text-[15px] leading-relaxed text-ink-soft sm:text-base">{brief}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <RememberVisit item={{ href: back, title, kind: eyebrow.split(" · ")[0], icon, picture }} />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-ink-soft"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Checked {date(item.lastReviewedAt)}</span>
                    {viewer.isMember ? <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 font-bold text-accent-dark"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
                  </div>
                </div>

                {/* Price */}
                {priceRow ? (
                  <div className="flex flex-col gap-1 border-y border-line py-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Price</span>
                    {priceRow.locked ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span aria-hidden className="select-none font-display text-[28px] font-extrabold text-heading blur-[6px]">UGX 0,000,000</span>
                        {unlock("See the price", "text-sm")}
                      </div>
                    ) : (
                      <span className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-brand-dark sm:text-[32px]">{empty(priceRow.value) ? <span className="text-lg font-semibold text-ink-muted">Price not added yet</span> : priceRow.value}</span>
                    )}
                  </div>
                ) : null}

                {/* Actions */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {locked ? (
                    <Link href={back} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />{unlockWhat(lockedLabels)}</Link>
                  ) : (
                    <a href="#contact" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Contact the seller</a>
                  )}
                  <WishlistButton id={item.id} />
                </div>

                {/* Contact and where to buy, right under the details */}
                <section id="contact" className="flex scroll-mt-28 flex-col gap-3 rounded-2xl bg-page p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-base font-extrabold text-heading">{whereRow ? "Where to buy" : "Contact"}</h2>
                    {locked ? <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-bold text-accent-dark"><LockKeyhole aria-hidden className="h-3 w-3" />Members</span> : null}
                  </div>
                  {whereRow?.locked || contact === "locked" ? (
                    <div aria-hidden className="flex flex-col gap-2">
                      <ContactRow icon={<Icon name="supplier" className="h-4 w-4" />} label="Seller" value="Seller name, Kampala" blurred />
                      <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value="+256 7•• ••• •••" blurred />
                    </div>
                  ) : whereRow && !empty(whereRow.value) ? (
                    <div className="rounded-xl border border-line bg-white p-3 text-sm leading-relaxed text-heading">{whereRow.value}</div>
                  ) : null}
                  {hasContact && contact !== "locked" && contact ? (
                    <div className="flex flex-col gap-2">
                      {contact.phone ? <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} href={`tel:${contact.phone.replace(/\s/g, "")}`} /> : null}
                      {contact.email ? <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} href={`mailto:${contact.email}`} /> : null}
                      {contact.website ? <ContactRow icon={<Globe className="h-4 w-4" />} label="Website" value={contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} href={contact.website} external /> : null}
                    </div>
                  ) : null}
                  {listSections.some((x) => x.table.key === "offers") ? (
                    <a href="#c-offers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark">See supplier offers <span aria-hidden>↓</span></a>
                  ) : null}
                  {locked ? (
                    <Link href={back} data-onboard="" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand bg-white text-sm font-bold text-brand hover:bg-brand hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock sellers and contacts</Link>
                  ) : !whereRow?.value && !hasContact ? (
                    <p className="text-sm text-ink-muted">Sellers not added yet.</p>
                  ) : (
                    <p className="text-xs leading-relaxed text-ink-muted">Say you found them on BizSphere-Ug. Agree prices and terms in writing before you pay.</p>
                  )}
                  {otherLinks.length ? (
                    <div className="flex flex-col gap-2 border-t border-line pt-3">
                      {otherLinks.map((l) => l.locked ? (
                        <Link key={l.label} href={back} data-onboard="" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand"><LockKeyhole aria-hidden className="h-4 w-4" />{l.label}</Link>
                      ) : (
                        <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"><Icon name={l.icon ?? "link"} className="h-4 w-4" />{l.label} ↗</a>
                      ))}
                    </div>
                  ) : null}
                </section>
              </div>

              {/* Gallery: on top on phones; the left column from tablet width, pinned while the details scroll */}
              <div className="order-first mx-auto w-full max-w-[520px] md:sticky md:top-24 md:max-w-none">
                <ProductGallery images={images} videos={videos} icon={icon} />
              </div>
            </div>
          </div>
        </section>

        {/* Section tabs: stay under the site header while reading */}
        <nav aria-label="On this page" className="sticky top-[var(--hh)] z-30 border-y border-line bg-white/90 backdrop-blur-xl">
          <div className="container-site flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {productTabs.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-page hover:text-heading">{label}</a>
            ))}
          </div>
        </nav>

        <div className="bg-page">
          <div className="container-site flex flex-col gap-4 py-4 sm:py-5">
            {catalog ? <div id="catalog" className="scroll-mt-36">{catalog}</div> : null}
            {/* Two to a row from laptop width: specifications, description and the child sections */}
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
            {/* Specifications: one plain table, rows in alternating colours */}
            {(details && detailCount) || facts.length ? (
              <section id="specs" className="flex scroll-mt-36 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                <h2 className="font-display text-lg font-extrabold text-heading">Specifications</h2>
                {/* The key facts first (they used to sit beside the photo), then every other field */}
                {facts.length ? (
                  <dl className="overflow-hidden rounded-xl border border-line">
                    {facts.map((f, i) => (
                      <div key={f.label} className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-[13px] sm:text-sm ${i % 2 ? "bg-white" : "bg-brand-tint/50"}`}>
                        <dt className="text-ink-muted">{f.label}</dt>
                        <dd className="min-w-0 break-words font-semibold text-heading">{f.locked ? unlock("Members only", "text-sm") : f.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {details && detailCount ? <FieldSections table type={details.type} record={details.record} gated={details.gated && !viewer.isMember} skip={details.skip} back={back} /> : null}
              </section>
            ) : null}

            {shownTexts.length || children ? (
              <section id="overview" className="flex scroll-mt-36 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
                {shownTexts.map((t) => (
                  <div key={t.label} className="flex flex-col gap-1.5">
                    <h2 className="font-display text-base font-extrabold text-heading">{t.label}</h2>
                    {t.locked ? (
                      <p className="flex items-center gap-3 text-sm text-ink-muted">For members. {unlock("Unlock")}</p>
                    ) : (
                      <ReadMore text={t.text!} />
                    )}
                  </div>
                ))}
                {children}
              </section>
            ) : null}

            <ChildSections compact sections={listSections} gated={Boolean(details?.gated) && !viewer.isMember} back={back} />
            </div>
            <ChildSections sections={sections.filter((x) => x.table.layout === "gallery")} gated={Boolean(details?.gated) && !viewer.isMember} back={back} />

            {/* Checks: one short line instead of a panel */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck aria-hidden className="h-4 w-4 text-brand" />Checked {date(item.lastReviewedAt)}</span>
              <span aria-hidden>·</span>
              <Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link>
            </p>
            <div id="related" className="scroll-mt-36">
              <Connected contentItemId={item.id} title="Related" />
            </div>
            <RecentStrip exclude={back} title="You looked at these recently" />
          </div>
        </div>

        {/* Phones: the main action stays one tap away at the bottom of the screen */}
        <div aria-hidden className="h-24 lg:hidden" />
        <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{locked ? (planInfo.monthly ? `${planInfo.monthly} a month` : "Members") : "Price"}</span>
              <span className="truncate text-[13px] font-semibold text-heading">{!locked && priceRow && !empty(priceRow.value) ? priceRow.value : name}</span>
            </span>
            {locked ? (
              <Link href={back} data-onboard="" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />{unlockWhat(lockedLabels)}</Link>
            ) : (
              <a href="#contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Contact seller</a>
            )}
          </div>
        </div>
      </OnboardingGate>
    );
  }

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
      {/* ── 1–2. Identity and key facts: a deep deep brand blue band like the homepage hero. Title and
          access on the left; the photo (or, without one, the key facts) on the right. ── */}
      <header className="under-header bg-brand-deep text-white">
        <div className="container-site flex flex-col gap-4 py-4 sm:gap-7 sm:py-8 lg:py-12">
          {/* Phones: one clear way back. Wider screens: the full trail. */}
          <Link href={trail[0]} className="inline-flex min-h-[40px] w-fit items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white sm:hidden">
            <ArrowLeft aria-hidden className="h-4 w-4" />All {trail[1].toLowerCase()}
          </Link>
          <nav aria-label="Breadcrumb" className="hidden flex-wrap items-center gap-1.5 text-[13px] text-white/60 sm:flex">
            <Link href="/" className="text-white/60 hover:text-white">Home</Link>
            <span aria-hidden>/</span>
            <Link href={trail[0]} className="text-white/60 hover:text-white">{trail[1]}</Link>
            <span aria-hidden>/</span>
            <span className="max-w-[32ch] truncate text-white/90">{title}</span>
          </nav>

          <div className={`grid grid-cols-[minmax(0,1fr)] gap-5 lg:items-center lg:gap-12 ${picture ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}>
            <div className="flex min-w-0 flex-col gap-3 sm:gap-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] py-1 pl-1.5 pr-3 text-xs font-semibold text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink"><Icon name={icon} className="h-3 w-3" /></span>
                {eyebrow}
              </span>
              <h1 className="text-page-title">{title}</h1>
              {brief ? <p className="max-w-2xl text-base leading-relaxed text-white/80">{brief}</p> : null}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <RememberVisit item={{ href: back, title, kind: eyebrow.split(" · ")[0], icon, picture }} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-white/80"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Checked {date(item.lastReviewedAt)}</span>
                {viewer.isMember ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 font-bold text-ink"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span>
                ) : null}
              </div>
              {locked ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <Link href={back} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-white hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />{unlockWhat(lockedLabels)}</Link>
                  <span className="text-center text-xs text-white/60 sm:text-left">{planInfo.monthly ? `${planInfo.monthly} a month · ` : ""}MoMo, Airtel Money or card</span>
                </div>
              ) : null}
            </div>

            {picture ? (
              <figure className="order-first flex flex-col gap-2 lg:order-none">
                {/* External image URLs entered by editors; no Next image domain list to maintain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={picture} alt={title} className="aspect-[16/10] w-full rounded-2xl border border-white/10 bg-white/5 object-cover sm:aspect-[4/3] sm:rounded-3xl" />
                {pictureCredit ? <figcaption className="text-xs text-white/50">{pictureCredit}</figcaption> : null}
              </figure>
            ) : shownRows.length ? <Facts rows={shownRows} unlock={unlock} /> : null}
          </div>
        </div>
      </header>

      {/* Section tabs: stay under the site header while reading */}
      <nav aria-label="On this page" className="sticky top-[var(--hh)] z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="container-site flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {tabs.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-page hover:text-heading">{label}</a>
          ))}
        </div>
      </nav>

      {/* Full-width block under the tabs (a supplier's product catalog) */}
      {catalog ? <div className="bg-page"><div id="catalog" className="container-site scroll-mt-36 pt-6 sm:pt-8">{catalog}</div></div> : null}

      <div className="bg-page"><div className="container-site grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 lg:py-10">
        <div className="flex min-w-0 flex-col gap-6">
          {/* ── 3. Practical detail ── */}
          {shownTexts.length || children ? (
            <section id="overview" className="flex scroll-mt-36 flex-col gap-4">
              {shownTexts.map((t) => (
                <div key={t.label} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 className="font-display text-lg font-extrabold tracking-[-0.01em] text-heading sm:text-xl">{t.label}</h2>
                  {t.locked ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-page p-4 text-sm text-ink-muted">
                      <span>The {t.label.toLowerCase()} is for members.</span>{unlock("Unlock")}
                    </div>
                  ) : (
                    <ReadMore text={t.text!} />
                  )}
                </div>
              ))}
              {children}
            </section>
          ) : null}

          <ChildSections sections={sections.filter((x) => x.table.layout !== "gallery")} gated={Boolean(details?.gated) && !viewer.isMember} back={back} />

          {/* Every other field, folded away: one tap for people who want it all */}
          {details && detailCount ? (
            <Expand id="details" summary="All details" count={detailCount}>
              <FieldSections bare type={details.type} record={details.record} gated={details.gated && !viewer.isMember} skip={details.skip} back={back} />
            </Expand>
          ) : null}

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
          {picture && shownRows.length ? <Facts rows={shownRows} unlock={unlock} /> : null}
          {product ? <ProductCard product={product} back={back} price={planInfo.monthly} /> : null}

          {/* Phones already have the unlock button in the header and the bar at the bottom */}
          {locked && !product ? (
            <section className="hidden flex-col gap-3 rounded-2xl bg-brand-deep p-6 text-white lg:flex">
              <span className="font-display text-base font-bold">See the full listing</span>
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
                <h2 className="font-display text-lg font-extrabold text-heading">Contact</h2>
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
              <h2 className="mb-0.5 font-display text-sm font-extrabold text-heading">Useful links</h2>
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
      </div>
        {/* What they looked at before: easy to go back to, and the site feels like theirs */}
        <div className="container-site pb-10"><RecentStrip exclude={back} title="You looked at these recently" /></div>
      </div>

      {/* Phones: the download stays one tap away at the bottom of the screen */}
      {bar === "product" && product ? (
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
      ) : bar === "contact" && contact !== undefined ? (
        // Phones: getting in touch stays one tap away at the bottom of the screen.
        <>
          <div aria-hidden className="h-24 lg:hidden" />
          <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
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
      ) : bar === "unlock" ? (
        // Phones: what's hidden and how to see it, always in reach.
        <>
          <div aria-hidden className="h-24 lg:hidden" />
          <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{planInfo.monthly ? `${planInfo.monthly} a month` : "Members"}</span>
                <span className="truncate text-[13px] font-semibold text-heading">{title}</span>
              </span>
              <Link href={back} data-onboard="" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />{unlockWhat(lockedLabels)}</Link>
            </div>
          </div>
        </>
      ) : null}
    </OnboardingGate>
  );
}

/** The unlock button names what it shows, in plain words: "See price and source". */
function unlockWhat(labels: string[]) {
  const named = labels.filter((l) => l.length <= 16).slice(0, 2).map((l) => l.toLowerCase());
  return named.length ? `See ${named.join(" and ")}` : "Unlock full details";
}

/** "Key facts": the client's main fields as big tiles, two to a row, easy to scan on a phone. */
function Facts({ rows, unlock }: { rows: DetailRow[]; unlock: (label?: string, cls?: string) => React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 text-ink sm:p-5">
      <span className="font-display text-base font-bold text-heading">Key facts</span>
      <dl className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          // Long values (addresses, lists of sellers) get the full row.
          <div key={r.label} className={`flex min-w-0 flex-col gap-1 rounded-xl bg-page p-3 ${!r.locked && typeof r.value !== "string" ? "col-span-2" : typeof r.value === "string" && r.value.length > 28 ? "col-span-2" : ""}`}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{r.label}</dt>
            <dd className="break-words text-[15px] font-bold leading-snug text-heading">
              {r.locked ? unlock("Members only", "text-sm") : r.value}
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
