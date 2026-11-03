import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, Package, Phone, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { date, money, moneyRange } from "@/lib/format";
import { OnboardingGate } from "@/components/Onboarding";
import { ProductGallery } from "@/components/ProductGallery";
import { SupplierCatalog, type CatalogItem } from "@/components/SupplierCatalog";

export const dynamic = "force-dynamic";

/**
 * One product from a supplier's catalog, as a shop product page: photo on the left; name,
 * supplier, price, unit, availability, description and how to contact the supplier on the right;
 * more from the same supplier below. Only approved (PUBLISHED) products of a published supplier.
 * Prices and contacts are member detail, as on the supplier's page.
 */
export default async function SupplierProductPage({ params }: { params: { slug: string; id: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "SUPPLIER", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { supplier: { include: { listings: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } } } } },
  });
  const s = item?.supplier;
  const product = s?.listings.find((l) => l.id === params.id);
  if (!item || !s || !product) notFound();

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const back = `/suppliers/${item.slug}`;
  const path = `${back}/products/${product.id}`;
  const supplierName = item.title.replace(/^Sample:\s*/i, "");
  const name = product.productName.replace(/^Sample:\s*/i, "");
  const price = product.priceMin === null && product.priceMax === null ? null : moneyRange(product.priceMin, product.priceMax, product.currency);
  const plan = await cachedMemberPlan();
  const planInfo = {
    name: plan?.name ?? "Member",
    daily: plan?.priceDaily != null ? money(plan.priceDaily, plan.currency) : null,
    monthly: plan?.priceMonthly != null ? money(plan.priceMonthly, plan.currency) : null,
    yearly: plan?.priceYearly != null ? money(plan.priceYearly, plan.currency) : null,
  };
  const more: CatalogItem[] = s.listings.filter((l) => l.id !== product.id).map((l) => ({
    id: l.id, name: l.productName, image: l.imageUrl, unit: l.unit, availability: l.availability, text: l.specifications,
    price: gated || (l.priceMin === null && l.priceMax === null) ? null : moneyRange(l.priceMin, l.priceMax, l.currency),
  }));
  const facts = ([
    ["Unit", product.unit],
    ["Availability", product.availability],
    ["Minimum order", product.minimumOrderQuantity !== null ? `${Number(product.minimumOrderQuantity).toLocaleString("en-UG")}${product.unit ? ` ${product.unit}` : ""}` : null],
    ["Price checked", product.quotedAt ? date(product.quotedAt) : null],
  ] as [string, string | null][]).filter(([, v]) => v);

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
      <section className="bg-white">
        <div className="container-site flex flex-col gap-3 py-3 sm:gap-4 sm:py-5">
          <Link href={back} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand">
            <ArrowLeft aria-hidden className="h-4 w-4" />All products from {supplierName}
          </Link>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-8">
            <div className="mx-auto w-full max-w-[520px] md:sticky md:top-24 md:max-w-none">
              <ProductGallery images={product.imageUrl ? [{ src: product.imageUrl, alt: name }] : []} icon="supplier" />
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Link href={back} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-dark hover:text-brand"><Store aria-hidden className="h-3.5 w-3.5" />{supplierName}</Link>
                <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[34px]">{name}</h1>
              </div>

              <div className="flex flex-col gap-0.5 border-y border-line py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Price{product.unit ? ` per ${product.unit}` : ""}</span>
                {gated ? (
                  <span className="flex flex-wrap items-center gap-3">
                    <span aria-hidden className="select-none font-display text-[28px] font-extrabold text-heading blur-[6px]">UGX 0,000,000</span>
                    <Link href={path} data-onboard="" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />See the price</Link>
                  </span>
                ) : (
                  <span className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-brand-dark sm:text-[32px]">{price ?? <span className="text-lg font-semibold text-ink-muted">Ask the supplier</span>}</span>
                )}
              </div>

              {facts.length ? (
                <dl className="overflow-hidden rounded-xl border border-line">
                  {facts.map(([k, v], n) => (
                    <div key={k} className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-[13px] sm:text-sm ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                      <dt className="text-ink-muted">{k}</dt><dd className="font-semibold text-heading">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {product.specifications ? (
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-base font-extrabold text-heading">Description</h2>
                  <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{product.specifications}</p>
                </div>
              ) : null}

              {/* Contact the supplier: members see the phone and email; everyone else unlocks them */}
              <div className="flex flex-col gap-2 rounded-2xl bg-page p-4">
                <h2 className="font-display text-base font-extrabold text-heading">Buy from {supplierName}</h2>
                {gated ? (
                  <Link href={path} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock price and contacts</Link>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Call {s.phone}</a> : null}
                    {s.email ? <a href={`mailto:${s.email}?subject=${encodeURIComponent(name)}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-[15px] font-semibold text-heading hover:border-brand hover:text-brand"><Mail aria-hidden className="h-4 w-4" />Email</a> : null}
                    {!s.phone && !s.email ? <Link href={back} className="text-sm font-semibold">See the supplier&apos;s page →</Link> : null}
                  </div>
                )}
                <p className="text-xs text-ink-muted">Say you found them on BizSphere-Ug. Agree prices and terms in writing before you pay.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-page">
        <div className="container-site py-5 sm:py-6">
          {more.length ? (
            <SupplierCatalog items={more} gated={gated} back={back} title={`More from ${supplierName}`} />
          ) : (
            <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold"><Package aria-hidden className="h-4 w-4" />See {supplierName}&apos;s page</Link>
          )}
        </div>
      </div>
    </OnboardingGate>
  );
}
