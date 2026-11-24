import { itemMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { phoneNumbers } from "@/lib/expert-names";
import { moneyRange } from "@/lib/format";
import { ContactButtons } from "@/components/ContactButtons";
import { trackView } from "@/components/DetailParts";
import { FieldSections, visibleGroups } from "@/components/FieldSections";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";
import { PdfOpenButton } from "@/components/PdfViewer";

export const dynamic = "force-dynamic";

/**
 * A supplier's page in the same layout as an expert's profile (client, 24 Nov 2026): the photo or logo beside a table
 * of their details, then the Products table (picture, name, description, pack, price), each row opening the product's
 * own page, then the story of the business. Beside it, a contact card that stays in view on wide screens and comes
 * first on phones.
 *
 * Address comes from the main location, the catalogue from the first document under "Photos and
 * media". Phone, email and prices are member detail: for visitors they are never sent to the page.
 */
export default async function SupplierPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    // Published pages for everyone; staff see drafts; a seller also sees their own page before it is approved
    // ("See my page" on their dashboard gave a 404 for a seller who had just joined, 11 Nov 2026).
    where: { slug: params.slug, contentType: "SUPPLIER", ...(viewer.isStaff ? {} : viewer.userId ? { OR: [{ publicationStatus: "PUBLISHED" as const }, { supplier: { organization: { members: { some: { userId: viewer.userId } } } } }] } : { publicationStatus: "PUBLISHED" as const }) },
    include: {
      primaryCategory: true,
      media: { where: { mediaType: "document" }, orderBy: { displayOrder: "asc" }, take: 1, include: { versions: { where: { isCurrent: true }, take: 1 } } },
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
  // A PDF catalogue can be read on the site before downloading
  const cataloguePdf = catalogue ? catalogue.versions[0]?.mimeType === "application/pdf" || /\.pdf$/i.test(catalogue.versions[0]?.fileLocation ?? catalogue.fileLocation) : false;
  const catalogueLocked = catalogue ? catalogue.accessLevel !== "PUBLIC" && !viewer.isMember : false;
  const kind = s.supplierType ? s.supplierType.charAt(0) + s.supplierType.slice(1).toLowerCase().replace(/_/g, " ") : null;
  // Both the brief and the description from the admin (once, when they are the same)
  const about = [...new Set([item.shortSummary, item.overview].filter((x): x is string => Boolean(x?.trim())))].join("\n\n") || null;

  // Prices stay on the server for visitors: `gated` cards show "See price" instead.
  const products = s.listings.map((l) => ({
    id: l.id, name: l.productName, image: l.imageUrl, unit: l.unit, availability: l.availability, text: l.specifications,
    price: gated || (l.priceMin === null && l.priceMax === null) ? null : moneyRange(l.priceMin, l.priceMax, l.currency),
    minOrder: l.minimumOrderQuantity !== null ? Number(l.minimumOrderQuantity).toLocaleString("en-UG") : null,
  }));

  // The template's rows, as on an expert's profile (24 Nov 2026). Phone, WhatsApp, email and the catalogue are member
  // detail: a lock, never the value.
  const lock = (key: string) => <Link key={key} href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</Link>;
  const numbers = (value: string | null, key: string) => {
    if (!value) return null;
    if (gated) return lock(key);
    const list = phoneNumbers(value);
    return list.length ? list.map((p, n) => <span key={p}>{n ? ", " : ""}<a href={`tel:${p.replace(/[^+0-9]/g, "")}`} className="text-brand hover:text-brand-dark">{p}</a></span>) : value;
  };
  const web = s.website ? (/^https?:\/\//i.test(s.website) ? s.website : `https://${s.website}`) : null;
  const profile: [string, React.ReactNode][] = [
    ["Contact person", s.contactPerson],
    ["Address", address],
    ["Phone", numbers(s.phone, "ph")],
    ["WhatsApp", numbers(s.whatsapp, "wa")],
    ["Country", s.country],
    ["Email", s.email ? (gated ? lock("em") : <a href={`mailto:${s.email}`} className="break-all text-brand hover:text-brand-dark">{s.email}</a>) : null],
    ["Website", web ? <a href={web} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{web.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</a> : null],
    ["Category", item.primaryCategory?.name],
    ["Business type", kind],
    ["What they sell", s.items.join(", ")],
    ["Catalogue", catalogue ? (catalogueLocked ? lock("ca")
      : cataloguePdf
        ? <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"><PdfOpenButton file={`/api/files/${catalogue.id}?inline=1`} download={`/api/files/${catalogue.id}`} title={`${item.title}: catalogue`} className="font-semibold text-brand hover:text-brand-dark">Read here</PdfOpenButton><a href={`/api/files/${catalogue.id}`} className="font-semibold text-brand hover:text-brand-dark">Download</a></span>
        : <a href={`/api/files/${catalogue.id}`} className="font-semibold text-brand hover:text-brand-dark">Download</a>) : null],
  ];
  const th = "px-4 py-2.5 text-left text-[12px] font-semibold text-white";
  const td = "px-4 py-3 align-top text-[14px] text-ink-soft";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article data-compact-page="">
        {item.publicationStatus !== "PUBLISHED" ? (
          <p role="status" className="bg-accent px-4 py-3 text-center text-[14px] font-semibold text-ink">Only you can see this page for now. Our team is checking it, and it goes on the website once approved. <Link href="/supplier" className="underline">Back to my dashboard</Link></p>
        ) : null}
        {/* ── Shop banner ── */}
        <header className="under-header hero-glow bg-navy text-white">
          <div className="container-site flex flex-col gap-5 pad-hero">
            <Link href="/suppliers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white"><ArrowLeft aria-hidden className="h-4 w-4" />All suppliers</Link>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="text-hero text-[26px] leading-[1.1] sm:text-[36px]">{name}</h1>
                  {[item.primaryCategory?.name, kind, s.country].some(Boolean) ? <p className="text-[15px] text-white/80">{[item.primaryCategory?.name, kind, s.country].filter(Boolean).join(" · ")}</p> : null}
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
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-start gap-6 pad-body lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            {/* ── The shop ── */}
            <div className="flex min-w-0 flex-col gap-6">
              {/* ── The profile: photo or logo on the left, the details on the right ── */}
              <section aria-label="Supplier profile" className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div className="flex flex-col items-center justify-center gap-4 border-b border-line bg-page p-6 text-center md:border-b-0 md:border-r">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address
                    <img src={logo} alt={name} data-nofit="" className="max-h-[260px] w-full max-w-[260px] rounded-xl object-contain" />
                  ) : <span aria-hidden className="flex h-32 w-32 items-center justify-center rounded-2xl bg-brand-tint font-display text-[40px] font-extrabold text-brand">{name.charAt(0)}</span>}
                  <span className="font-display text-[18px] font-extrabold leading-snug text-heading">{name}</span>
                </div>
                <dl className="divide-y divide-line">
                  {profile.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-[14px] sm:grid-cols-[130px_minmax(0,1fr)] sm:px-5">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="min-w-0 break-words font-medium text-heading">{v || <span className="font-normal text-ink-muted">—</span>}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* ── Products ── */}
              <section id="products" className="scroll-mt-28 overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex items-baseline justify-between gap-3 px-4 py-4 sm:px-5">
                  <h2 className="font-display text-[20px] font-extrabold leading-tight text-heading">Products</h2>
                  <span className="text-[13px] text-ink-muted">{products.length} {products.length === 1 ? "product" : "products"}</span>
                </div>
                {products.length ? (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full border-collapse">
                        <thead className="bg-brand-deep"><tr><th scope="col" className={`${th} w-12`}>SN</th><th scope="col" className={th}>Picture</th><th scope="col" className={th}>Product name</th><th scope="col" className={th}>Description</th><th scope="col" className={th}>Pack</th><th scope="col" className={th}>Price</th></tr></thead>
                        <tbody>
                          {products.map((p, n) => (
                            <tr key={p.id} className="relative border-t border-line transition-colors hover:bg-brand-tint/50">
                              <td className={`${td} tabular-nums text-ink-muted`}>{n + 1}</td>
                              <td className={td}><ProductPicture src={p.image} /></td>
                              <td className={td}>
                                {/* The link's ::after covers the row: a tap anywhere opens the product */}
                                <Link href={`${path}/products/${p.id}`} className="font-display font-bold text-heading after:absolute after:inset-0 hover:text-brand">{p.name.replace(/^Sample:\s*/i, "")}</Link>
                                {p.availability ? <span className="block text-[12px] font-semibold text-[#1F7A4D]">{p.availability}</span> : null}
                              </td>
                              <td className={td}><span className="line-clamp-3">{p.text ?? "—"}</span></td>
                              <td className={td}>{p.unit ?? "—"}{p.minOrder ? <span className="block text-[12px] text-ink-muted">Min order: {p.minOrder}</span> : null}</td>
                              <td className={`${td} whitespace-nowrap font-semibold text-heading`}>{gated ? <span className="inline-flex items-center gap-1.5 text-brand"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</span> : p.price ?? <span className="font-normal text-ink-muted">Ask for price</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ol className="divide-y divide-line border-t border-line md:hidden">
                      {products.map((p, n) => (
                        <li key={p.id} className="relative flex gap-3 p-4">
                          {p.image ? <ProductPicture src={p.image} /> : null}
                          <div className="flex min-w-0 flex-1 flex-col gap-1 text-[14px]">
                            <Link href={`${path}/products/${p.id}`} className="font-display font-bold text-heading after:absolute after:inset-0">{n + 1}. {p.name.replace(/^Sample:\s*/i, "")}</Link>
                            {p.text ? <span className="line-clamp-2 text-ink-soft">{p.text}</span> : null}
                            {p.unit ? <span className="text-ink-soft"><span className="text-ink-muted">Pack:</span> {p.unit}</span> : null}
                            <span className="font-semibold text-heading">{gated ? <span className="inline-flex items-center gap-1.5 text-brand"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Price for members</span> : p.price ?? <span className="font-normal text-ink-muted">Ask for price</span>}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : <p className="border-t border-line px-5 py-4 text-[14px] text-ink-muted">This supplier hasn&apos;t added products yet.</p>}
              </section>

              {about ? (
                <section className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                  <h2 className="font-display text-lg font-extrabold text-heading">About {name}</h2>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{about}</p>
                </section>
              ) : null}
              {/* What else they offer (brands, wholesale or retail, installation, spare parts…), as filled in the admin */}
              {visibleGroups("SUPPLIER", s as unknown as Record<string, unknown>).length ? (
                <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
                  <FieldSections bare type="SUPPLIER" record={s as unknown as Record<string, unknown>} gated={gated} back={path} />
                </section>
              ) : null}
              {gated ? <MemberValue wide back={path} plan={plan} unlocks={[...(s.phone || s.whatsapp ? ["Phone and WhatsApp"] : []), ...(s.email ? ["Email address"] : []), ...(s.listings.some((l) => l.priceMin !== null || l.priceMax !== null) ? ["Product prices"] : []), ...(catalogueLocked ? ["Catalogue download"] : [])]} /> : null}
              <p className="text-[13px] text-ink-muted"><Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link></p>
            </div>

            {/* ── Contact: first on phones, beside the shop on wide screens ── */}
            <aside className="order-first flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-32 lg:order-none">
              <h2 className="font-display text-lg font-extrabold text-heading">Contact this supplier</h2>
              <ContactButtons me="us" phone={s.phone} whatsapp={s.whatsapp} email={s.email} gated={gated} back={path} />
              <p className="border-t border-line pt-3 text-[12px] leading-snug text-ink-muted">Always do your due diligence before dealing with any supplier and take caution before making any payments.</p>
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}

/** A product's picture, or a dash when there is none. */
function ProductPicture({ src }: { src: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
  return src ? <img src={src} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover" /> : <span className="text-ink-muted">—</span>;
}

/** Browser title, description and share picture for this page (src/lib/seo.ts). */
export const generateMetadata = ({ params }: { params: { slug: string } }) => itemMetadata("SUPPLIER", params.slug);
