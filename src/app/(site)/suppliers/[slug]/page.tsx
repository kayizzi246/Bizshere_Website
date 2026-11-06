import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, Globe, Link2, LockKeyhole, MapPin, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { moneyRange } from "@/lib/format";
import { ContactButtons } from "@/components/ContactButtons";
import { trackView } from "@/components/DetailParts";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { SupplierCatalog } from "@/components/SupplierCatalog";
import { WishlistButton } from "@/components/Wishlist";

export const dynamic = "force-dynamic";

/**
 * A supplier's shop front: a plain navy banner with their logo, name and what they sell; then the
 * products as a shop grid with the story of the business above it, beside a contact card that stays
 * in view on wide screens. On phones the contact card comes first. Details with no value are left out.
 *
 * Address comes from the main location, the catalogue from the first document under "Photos and
 * media". Phone, email and prices are member detail: for visitors they are never sent to the page.
 */
export default async function SupplierPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "SUPPLIER", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      media: { where: { mediaType: "document" }, orderBy: { displayOrder: "asc" }, take: 1 },
      supplier: {
        include: {
          organization: { select: { logoUrl: true, locations: { orderBy: { isPrimary: "desc" }, take: 1 } } },
          listings: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!item || !item.supplier) notFound();
  const s = item.supplier;
  const path = `/suppliers/${item.slug}`;
  await trackView(viewer, item.id, path);
  const plan = popupPlan(await cachedMemberPlan());

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const name = item.title.replace(/^Sample:\s*/i, "");
  const logo = s.organization.logoUrl ?? s.pictureUrl;
  const place = s.organization.locations[0];
  const address = [place?.physicalAddress, place?.town].filter(Boolean).join(", ");
  const catalogue = item.media[0];
  const catalogueLocked = catalogue ? catalogue.accessLevel !== "PUBLIC" && !viewer.isMember : false;
  const kind = s.supplierType ? s.supplierType.charAt(0) + s.supplierType.slice(1).toLowerCase().replace(/_/g, " ") : null;
  const about = item.overview ?? item.shortSummary;

  // Prices stay on the server for visitors: `gated` cards show "See price" instead.
  const products = s.listings.map((l) => ({
    id: l.id, name: l.productName, image: l.imageUrl, unit: l.unit, availability: l.availability, text: l.specifications,
    price: gated || (l.priceMin === null && l.priceMax === null) ? null : moneyRange(l.priceMin, l.priceMax, l.currency),
    minOrder: l.minimumOrderQuantity !== null ? Number(l.minimumOrderQuantity).toLocaleString("en-UG") : null,
  }));

  const details: [LucideIcon, string, React.ReactNode][] = [
    ...(address ? [[MapPin, "Address", address] as [LucideIcon, string, React.ReactNode]] : []),
    ...(s.country ? [[Globe, "Country", s.country] as [LucideIcon, string, React.ReactNode]] : []),
    ...(s.website ? [[Link2, "Website", <a key="w" href={s.website} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-brand hover:text-brand-dark">{s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>] as [LucideIcon, string, React.ReactNode]] : []),
    ...(catalogue ? [[FileDown, "Catalogue", catalogueLocked
      ? <Link key="c" href={path} data-onboard="" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>
      : <a key="c" href={`/api/files/${catalogue.id}`} className="font-semibold text-brand hover:text-brand-dark">Download</a>] as [LucideIcon, string, React.ReactNode]] : []),
  ];

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article>
        {/* ── Shop banner ── */}
        <header className="under-header bg-navy text-white">
          <div className="container-site flex flex-col gap-5 pb-8 pt-5 sm:pb-10 sm:pt-7">
            <Link href="/suppliers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white"><ArrowLeft aria-hidden className="h-4 w-4" />All suppliers</Link>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address
                  <img src={logo} alt="" className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover ring-4 ring-white/15 sm:h-28 sm:w-28" />
                ) : <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-[32px] font-extrabold text-brand ring-4 ring-white/15 sm:h-28 sm:w-28">{name.charAt(0)}</span>}
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="text-hero text-[26px] leading-[1.1] sm:text-[36px]">{name}</h1>
                  {[item.primaryCategory?.name, kind, s.country].some(Boolean) ? <p className="text-[15px] text-white/80">{[item.primaryCategory?.name, kind, s.country].filter(Boolean).join(" · ")}</p> : null}
                  {s.items.length ? (
                    <ul aria-label="What they sell" className="flex flex-wrap gap-1.5 pt-1">
                      {s.items.slice(0, 6).map((x) => <li key={x} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold text-white">{x}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 text-ink sm:w-52">
                <span className="block w-full rounded-xl bg-white"><WishlistButton id={item.id} /></span>
                <RememberVisit item={{ href: path, title: name, kind: "Supplier", icon: "supplier", picture: logo }} />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-page">
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-start gap-6 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            {/* ── The shop ── */}
            <div className="flex min-w-0 flex-col gap-6">
              {about ? (
                <section className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                  <h2 className="font-display text-lg font-extrabold text-heading">About {name}</h2>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{about}</p>
                </section>
              ) : null}
              <div id="products" className="scroll-mt-28"><SupplierCatalog items={products} gated={gated} back={path} wide={false} /></div>
              {gated ? <MemberValue wide back={path} plan={plan} unlocks={[...(s.phone ? ["Phone and WhatsApp"] : []), ...(s.email ? ["Email address"] : []), ...(s.listings.some((l) => l.priceMin !== null || l.priceMax !== null) ? ["Product prices"] : []), ...(catalogueLocked ? ["Catalogue download"] : [])]} /> : null}
              <p className="text-[13px] text-ink-muted"><Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link></p>
            </div>

            {/* ── Contact: first on phones, beside the shop on wide screens ── */}
            <aside className="order-first flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24 lg:order-none">
              <h2 className="font-display text-lg font-extrabold text-heading">Contact this supplier</h2>
              <ContactButtons me="us" phone={s.phone} email={s.email} gated={gated} back={path} />
              {details.length ? (
                <dl className="flex flex-col gap-3 border-t border-line pt-4">
                  {details.map(([Glyph, label, value]) => (
                    <div key={label} className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Glyph aria-hidden className="h-4 w-4" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-col">
                        <dt className="text-[12px] font-medium text-ink-muted">{label}</dt>
                        <dd className="min-w-0 break-words text-[14px] font-semibold text-heading">{value}</dd>
                      </span>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="border-t border-line pt-3 text-[12px] leading-snug text-ink-muted">Say you found them on BizSphere-Ug. Agree prices and terms in writing before you pay.</p>
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}
