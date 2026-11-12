import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, LockKeyhole, Mail, MapPin, MessageCircle, Package, Phone, ShieldCheck, Store } from "lucide-react";
import { whatsappHref } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { date, money, moneyRange } from "@/lib/format";
import { OnboardingGate } from "@/components/Onboarding";
import { ProductGallery } from "@/components/ProductGallery";
import { SupplierCatalog, type CatalogItem } from "@/components/SupplierCatalog";
import { popupPlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * One product from a supplier's catalog, laid out like a shop (client, 11 Nov 2026): the photos large and
 * whole on the left, thumbnails beside them, a close-up under the mouse; on the right the name, price,
 * stock, the key facts and the ways to buy (Call, WhatsApp, Email), with the seller's card under them;
 * the description below; more from the same seller at the bottom. On phones a bar along the bottom keeps
 * Call and WhatsApp in reach. Only approved (PUBLISHED) products of a published supplier.
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
  const planInfo = popupPlan(plan);
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

  const photos = [product.imageUrl, ...product.moreImages].filter((p): p is string => Boolean(p));
  const inStock = product.availability && /in stock|available|yes/i.test(product.availability);
  const minOrder = product.minimumOrderQuantity !== null ? `${Number(product.minimumOrderQuantity).toLocaleString("en-UG")}${product.unit ? ` ${product.unit}` : ""}` : null;
  const ask = `Hello ${supplierName}, I saw "${name}" on BizSphere-Ug. Is it available?`;
  const btn = "inline-flex items-center justify-center gap-2 rounded-lg px-5 font-bold";
  // One main action (client, 12 Nov 2026: simple, made to convert): Call, or Unlock for visitors; WhatsApp and Email quiet
  const buy = gated ? (
    <div className="flex flex-col gap-2">
      <Link href={path} data-onboard="" className={`${btn} min-h-[54px] w-full bg-accent text-center text-[16px] text-ink hover:bg-accent-dark hover:text-white`}><LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />{planInfo.daily ? `Unlock the price and contacts · ${planInfo.daily} a day` : "Unlock the price and contacts"}</Link>
      <p className="text-[13px] text-ink-muted">Pay with MoMo, Airtel Money or card. The price and the seller&apos;s phone open straight away.</p>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      {s.phone ? <a href={`tel:${s.phone.replace(/\s/g, "")}`} className={`${btn} min-h-[54px] w-full bg-brand text-[16px] text-white hover:bg-brand-dark hover:text-white`}><Phone aria-hidden className="h-4 w-4" />Call {s.phone}</a> : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        {s.phone ? <a href={whatsappHref(s.phone, ask)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[14px] font-semibold text-heading hover:border-[#25D366] hover:text-heading"><MessageCircle aria-hidden className="h-4 w-4 text-[#1DA851]" />WhatsApp</a> : null}
        {s.email ? <a href={`mailto:${s.email}?subject=${encodeURIComponent(name)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-[14px] font-semibold text-heading hover:border-brand hover:text-brand"><Mail aria-hidden className="h-4 w-4" />Email</a> : null}
      </div>
      {!s.phone && !s.email ? <Link href={back} className="text-sm font-semibold">See the seller&apos;s page →</Link> : null}
    </div>
  );

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={planInfo}>
      {/* The top, like the business idea and machine pages (client, 12 Nov 2026): warm specks, a smaller photo, one card
          with the price and how it is sold, one main action, the seller. No gradients, no shadows. */}
      <section className="speckle under-header-pad">
        <div className="container-site flex flex-col gap-4 pb-8 pt-3 sm:gap-5 sm:pt-5">
          {/* Where you are */}
          <nav aria-label="You are here" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted">
            <Link href="/suppliers" className="text-ink-muted hover:text-brand">Suppliers</Link><span aria-hidden>/</span>
            <Link href={back} className="text-ink-muted hover:text-brand">{supplierName}</Link><span aria-hidden>/</span>
            <span className="truncate text-ink-soft">{name}</span>
          </nav>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-12">
            {/* The photos */}
            <div className="mx-auto w-full min-w-0 max-w-[460px] md:max-w-none">
              <ProductGallery shop images={photos.map((src, n) => ({ src, alt: n ? `${name}, photo ${n + 1}` : name }))} icon="supplier" />
            </div>

            {/* Name, price and how to buy: stays in view beside the photos on wide screens */}
            <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-32">
              <div className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <Link href={back} className="inline-flex items-center gap-1.5 font-semibold text-brand-dark hover:text-brand"><Store aria-hidden className="h-4 w-4" />{supplierName}</Link>
                  {product.availability ? <span className={`inline-flex items-center gap-1 font-semibold ${inStock ? "text-[#1F7A4D]" : "text-ink-muted"}`}>{inStock ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : null}{product.availability}</span> : null}
                </p>
                <h1 className="text-hero text-[26px] leading-[1.12] text-heading sm:text-[32px] lg:text-[36px]">{name}</h1>
              </div>

              {/* The price and how it is sold, on one card: the price large with its unit beside it, then the facts in
                  a row that always fills the card (client, 12 Nov 2026: premium) */}
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <div className="flex flex-col gap-1.5 p-5">
                  {gated ? (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span aria-hidden className="select-none font-display text-[30px] font-extrabold leading-none text-heading blur-[7px]">UGX 00,000</span>
                      <span className="text-[13px] text-ink-muted">Price shown to members</span>
                    </p>
                  ) : (
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-hero text-[32px] leading-none text-heading sm:text-[38px]">{price ?? <span className="text-[18px] font-semibold text-ink-soft [-webkit-text-stroke:0]">Ask the seller for the price</span>}</span>
                      {price && product.unit ? <span className="text-[15px] text-ink-muted">/ {product.unit}</span> : null}
                    </p>
                  )}
                  {product.quotedAt ? <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted"><CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-[#1F7A4D]" />Price checked {date(product.quotedAt)}</p> : null}
                </div>
                {product.unit || minOrder ? (
                  <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] border-t border-line bg-page/60">
                    {product.unit ? <div className="flex flex-col gap-0.5 px-5 py-3"><dt className="text-[12px] text-ink-muted">Sold per</dt><dd className="font-display text-[15px] font-bold text-heading">{product.unit}</dd></div> : null}
                    {minOrder ? <div className="flex flex-col gap-0.5 border-line px-5 py-3 [&:not(:first-child)]:border-l"><dt className="text-[12px] text-ink-muted">Smallest order</dt><dd className="font-display text-[15px] font-bold text-heading">{minOrder}</dd></div> : null}
                  </dl>
                ) : null}
              </div>

              {buy}

              {/* The seller */}
              <Link href={back} className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-ink hover:border-brand hover:text-ink">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                  {s.pictureUrl ? <img src={s.pictureUrl} alt="" className="h-full w-full object-cover" /> : <Store aria-hidden className="h-5 w-5 text-brand/50" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-[15px] font-bold text-heading">{supplierName}</span>
                  <span className="flex items-center gap-1 text-[12px] text-ink-muted">{s.country ? <><MapPin aria-hidden className="h-3 w-3" />{s.country} · </> : null}{s.listings.length} product{s.listings.length === 1 ? "" : "s"}</span>
                </span>
                <span className="text-[13px] font-semibold text-brand group-hover:underline">See shop →</span>
              </Link>
              <p className="flex items-start gap-2 text-[12px] leading-snug text-ink-muted"><ShieldCheck aria-hidden className="mt-px h-4 w-4 shrink-0" />Always check the goods before you pay, and take care with payments to anyone you have not met.</p>
            </div>
          </div>

          {/* About the product */}
          {product.specifications ? (
            <section className="flex max-w-3xl flex-col gap-2 border-t border-line pt-6">
              <h2 className="font-display text-[19px] font-bold text-heading">About this product</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{product.specifications}</p>
            </section>
          ) : null}
        </div>
      </section>

      {/* Phones: Call and WhatsApp always in reach (data-sticky-bar lifts the chat button above it) */}
      {!gated && s.phone ? (
        <div data-sticky-bar="" className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
          <a href={`tel:${s.phone.replace(/\s/g, "")}`} className={`${btn} h-12 flex-1 bg-brand text-[15px] text-white hover:text-white`}><Phone aria-hidden className="h-4 w-4" />Call</a>
          <a href={whatsappHref(s.phone, ask)} target="_blank" rel="noopener noreferrer" className={`${btn} h-12 flex-1 bg-[#25D366] text-[15px] text-white hover:text-white`}><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp</a>
        </div>
      ) : null}

      <div className="bg-page">
        <div className="container-site pb-24 pt-5 sm:py-6 lg:pb-6">
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
