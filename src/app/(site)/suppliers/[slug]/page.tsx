import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, FileText, Globe, Link2, LockKeyhole, Mail, MapPin, Package, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { moneyRange } from "@/lib/format";
import { trackView } from "@/components/DetailParts";
import { OnboardingGate } from "@/components/Onboarding";
import { ProfileFacts, ProfileTop, type ProfileFact } from "@/components/ProfileTop";
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
  const rows: ProfileFact[] = [
    { label: "Address", icon: MapPin, value: address || none },
    { label: "Phone", icon: Phone, value: gated ? members : s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="text-heading hover:text-brand">{s.phone}</a> : none },
    { label: "Country", icon: Globe, value: s.country || none },
    { label: "Email", icon: Mail, value: gated ? members : s.email ? <a href={`mailto:${s.email}`} className="break-all text-heading hover:text-brand">{s.email}</a> : none },
    { label: "Website", icon: Link2, value: s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer" className="break-all text-brand hover:text-brand-dark">{s.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : none },
    { label: "Catalogue", icon: FileText, value: !catalogue ? none : catalogueLocked ? members : <a href={`/api/files/${catalogue.id}`} className="inline-flex items-center gap-1.5 text-brand hover:text-brand-dark"><FileDown aria-hidden className="h-4 w-4" />Download</a> },
  ];
  const th = "px-3 py-2.5 font-semibold";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article>
        <ProfileTop back="/suppliers" backLabel="All suppliers" image={logo} name={name} sub={item.primaryCategory?.name}>
          <span className="block w-full rounded-xl bg-white"><WishlistButton id={item.id} /></span>
          <RememberVisit item={{ href: path, title: name, kind: "Supplier", icon: "supplier", picture: logo }} />
        </ProfileTop>
        <div className="bg-page">
        <div className="container-site flex flex-col gap-4 pb-6">
          <ProfileFacts facts={rows} />

          {/* Products */}
          <section id="products" className="flex scroll-mt-28 flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <h2 className="font-display text-lg font-extrabold text-heading">Products</h2>
            {s.listings.length ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left text-[13px] sm:text-sm">
                  <thead className="bg-brand-tint text-xs font-bold text-brand-dark">
                    <tr>
                      <th className={`${th} w-12`}>SN</th><th className={th}>Product Name</th><th className={th}>Package Unit</th>
                      <th className={th}>Min Order</th><th className={th}>Price</th><th className={`${th} w-20`}>Picture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.listings.map((l, n) => (
                      <tr key={l.id} className="border-t border-line align-middle">
                        <td className="px-3 py-2 text-ink-muted">{n + 1}</td>
                        <td className="px-3 py-2"><Link href={`${path}/products/${l.id}`} className="font-semibold text-heading hover:text-brand">{l.productName.replace(/^Sample:\s*/i, "")}</Link></td>
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
        </div>
      </article>
    </OnboardingGate>
  );
}
