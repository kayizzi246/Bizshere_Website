import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, LockKeyhole, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { moneyRange } from "@/lib/format";
import { trackView } from "@/components/DetailParts";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { WishlistButton } from "@/components/Wishlist";

export const dynamic = "force-dynamic";

/**
 * A supplier, as the client's template "Supplier Detailed Page": name and logo beside a table of
 * Address, Phone, Country, Email, Website and Catalogue, then the Products table (SN, Product Name,
 * Package Unit, Min Order, Price, Picture).
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

  const members = <Link href={path} data-onboard="" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members</Link>;
  const none = <span className="font-normal text-ink-muted">—</span>;
  const rows: [string, React.ReactNode][] = [
    ["Address", address || none],
    ["Phone", gated ? members : s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="text-heading hover:text-brand">{s.phone}</a> : none],
    ["Country", s.country || none],
    ["Email", gated ? members : s.email ? <a href={`mailto:${s.email}`} className="break-all text-heading hover:text-brand">{s.email}</a> : none],
    ["Website", s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : none],
    ["Catalogue", !catalogue ? none : catalogueLocked ? members : <a href={`/api/files/${catalogue.id}`} className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><FileDown aria-hidden className="h-4 w-4" />Download</a>],
  ];
  const th = "px-3 py-2.5 font-semibold";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        <div className="container-site flex flex-col gap-4 py-5 sm:py-6">
          <Link href="/suppliers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand"><ArrowLeft aria-hidden className="h-4 w-4" />All suppliers</Link>

          {/* Name and logo, beside the details */}
          <section className="grid overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="flex flex-col items-center justify-center gap-3 border-b border-line p-6 text-center md:border-b-0 md:border-r">
              {logo ? (
                // Uploaded or editor-entered address; no Next image domain list to maintain.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={`${name} logo`} className="h-28 w-28 rounded-2xl border border-line object-cover" />
              ) : <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-brand-tint font-display text-[36px] font-extrabold text-brand">{name.charAt(0)}</span>}
              <span className="flex flex-col gap-1">
                <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-heading">{name}</h1>
                {item.primaryCategory ? <span className="text-sm text-ink-muted">{item.primaryCategory.name}</span> : null}
              </span>
              <span className="w-full max-w-[16rem]"><WishlistButton id={item.id} /></span>
              <RememberVisit tone="light" item={{ href: path, title: name, kind: "Supplier", icon: "supplier", picture: logo }} />
            </div>
            <dl className="divide-y divide-line text-[14px]">
              {rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:px-5">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="min-w-0 font-semibold text-heading">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Products */}
          <section id="products" className="flex scroll-mt-28 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <h2 className="hl w-fit font-display text-lg font-extrabold text-heading">Products</h2>
            {s.listings.length ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left text-[13px] sm:text-sm">
                  <thead className="bg-brand-deep text-xs text-white/90">
                    <tr>
                      <th className={`${th} w-12`}>SN</th><th className={th}>Product Name</th><th className={th}>Package Unit</th>
                      <th className={th}>Min Order</th><th className={th}>Price</th><th className={`${th} w-20`}>Picture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.listings.map((l, n) => (
                      <tr key={l.id} className={`border-t border-line align-middle ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                        <td className="px-3 py-2 text-ink-muted">{n + 1}</td>
                        <td className="px-3 py-2"><Link href={`${path}/products/${l.id}`} className="font-semibold text-heading hover:text-brand">{l.productName}</Link></td>
                        <td className="px-3 py-2 text-ink-soft">{l.unit ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{l.minimumOrderQuantity !== null ? Number(l.minimumOrderQuantity).toLocaleString("en-UG") : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-heading">{gated ? members : l.priceMin === null && l.priceMax === null ? <span className="font-normal text-ink-muted">—</span> : moneyRange(l.priceMin, l.priceMax, l.currency)}</td>
                        <td className="px-3 py-2">
                          <Link href={`${path}/products/${l.id}`} aria-label={`${l.productName} details`} className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-page">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {l.imageUrl ? <img src={l.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package aria-hidden className="h-5 w-5 text-brand/40" />}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-ink-muted">This supplier hasn&apos;t added products yet.</p>}
          </section>

          <p className="text-[13px] text-ink-muted"><Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link></p>
        </div>
      </article>
    </OnboardingGate>
  );
}
