import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, ImageIcon, KeyRound, Package, Pencil, Plus, Store, XCircle } from "lucide-react";
import { DashCard, DashHero, DashNotice, DashSteps } from "@/components/PartnerDash";
import { moneyRange } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConfirmButton } from "@/components/ConfirmButton";
import { UploadButton } from "@/components/UploadButton";
import { ProductPhotos } from "@/components/ProductPhotos";
import { SignOutButton } from "@/components/SignOutButton";
import { deleteProduct, saveProduct, saveSupplierDetails, saveSupplierPhoto } from "@/app/actions/supplier";
import { changeMyPin } from "@/app/actions/pin";
import { ChoosePin } from "@/components/ChoosePin";
import { site } from "@/config/site";
import { partnerAccess } from "@/lib/partners";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier dashboard", robots: { index: false } };

const NOTICE: Record<string, string> = {
  paid: "Payment received. Our team will check your details, and your page goes live once approved.",
  password: "Your PIN is changed.",
  photo: "Your photo is saved.",
  details: "Your details are saved and show on your page.",
  added: "Product added. It will show on your page once our team approves it. You can add another one below.",
  updated: "Changes sent. The product shows again once our team approves them.",
  deleted: "Product removed.",
};
const ERROR: Record<string, string> = {
  password: "Enter the same 4-digit PIN twice.",
  access: "You can only change your own listing.",
  photo: "Use the Upload button, or an address starting with https://.",
  details: "Check your details: the email must be valid, and the website must start with https://.",
  product: "Not saved. The product needs a name, and the price must be a number, e.g. 150,000.",
};

// What each product status means to a seller, in plain words.
const STATUS = {
  PUBLISHED: { label: "On your page", cls: "bg-[#E6F4EC] text-[#1F7A4D]", Icon: CheckCircle2 },
  IN_REVIEW: { label: "Waiting for approval", cls: "bg-accent-tint text-accent-dark", Icon: Clock },
  ARCHIVED: { label: "Not approved", cls: "bg-bad-bg text-bad-fg", Icon: XCircle },
} as const;

/**
 * Redesigned on 11 Nov 2026 (client: premium and very easy): a dark header with the seller's numbers
 * (PartnerDash), how it works in three steps, then two columns: products on the left (add one, see and
 * change them), the business details, main photo and PIN on the right.
 *
 * Seller dashboard (/supplier): a seller signs in at /suppliers/login with their phone and PIN.
 * They add products (shown once the team approves them at /admin/seller-products), see each
 * product's status, and change their photo and PIN. Access comes from the admin linking their
 * phone to the supplier (/admin/supplier-logins); the actions check it again on every change.
 */
export default async function SupplierPortal({ searchParams }: { searchParams: { saved?: string; error?: string; edit?: string } }) {
  const session = await getSession();
  // Signed out: the seller sign-in page (phone and PIN).
  if (!session?.user?.id) redirect("/suppliers/login");
  // First sign-in with a texted PIN (or one the team reset): choose your own before anything else.
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pinMustChange: true } });
  if (me?.pinMustChange) return <ChoosePin back="/supplier" error={searchParams.error === "password"} />;
  // Registered themselves and not paid, or not renewed. Sellers the team added have no listing plan.
  if ((await partnerAccess(session.user.id, "supplier")).mustPay) redirect("/suppliers/join");
  const suppliers = await prisma.supplier.findMany({
    where: { organization: { members: { some: { userId: session.user.id } } } },
    include: { contentItem: { select: { title: true, slug: true, publicationStatus: true } }, listings: { orderBy: { createdAt: "desc" } }, organization: { select: { locations: { orderBy: { isPrimary: "desc" }, take: 1 } } } },
  });

  const input = "input min-h-[44px] w-full text-[14px]";
  const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-soft";
  const signOut = <span className="w-32"><SignOutButton to="/supplier" className="border border-line bg-white text-ink-soft hover:border-brand" /></span>;

  if (suppliers.length === 0) {
    return (
      <div className="bg-page"><div className="container-site py-8">
        <section className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h1 className="font-display text-xl font-extrabold text-heading">This account isn&apos;t registered as a seller</h1>
          <Link href="/suppliers/join" className="btn-primary min-h-[42px] w-fit px-4 text-sm">Become a Supplier</Link>
          <p className="text-sm text-ink-soft">Call us to register your business as a seller. If you already have a seller sign-in, sign out and sign in with your seller phone and PIN.</p>
          <span className="flex flex-wrap items-center gap-3">
            {site.contact.phone ? <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="btn-primary min-h-[42px] px-4 text-sm">Call {site.contact.phone}</a> : <Link href="/contact" className="btn-primary min-h-[42px] px-4 text-sm">Contact us to register</Link>}
            {signOut}
          </span>
        </section>
      </div></div>
    );
  }

  return (
    <div className="bg-[#F1F4F8]">
      {suppliers.map((s) => {
        const name = s.contentItem.title.replace(/^Sample:\s*/i, "");
        const count = (st: string) => s.listings.filter((l) => l.status === st).length;
        const editing = s.listings.find((l) => l.id === searchParams.edit);
        return (
          <div key={s.id}>
            <DashHero kind="Supplier dashboard" name={name} sub={s.country} photo={s.pictureUrl} Fallback={Package} viewHref={`/suppliers/${s.contentItem.slug}`}
              signOut={<span className="w-32"><SignOutButton to="/supplier" className="border border-white/25 bg-white/10 text-white hover:bg-white/20" /></span>}
              stats={[
                { label: "Products on your page", value: count("PUBLISHED"), Icon: CheckCircle2, tone: "bg-[#1F7A4D] text-white" },
                { label: "Waiting for our check", value: count("IN_REVIEW"), Icon: Clock, tone: "bg-accent text-ink" },
                { label: "Not approved", value: count("ARCHIVED"), Icon: XCircle, tone: "bg-white/15 text-white" },
              ]} />

            <div className="container-site flex flex-col gap-5 py-5 sm:gap-6 sm:py-8">
              <DashNotice ok={searchParams.saved ? NOTICE[searchParams.saved] : undefined} bad={searchParams.error ? ERROR[searchParams.error] : undefined} />
              {s.contentItem.publicationStatus !== "PUBLISHED" ? <p role="status" className="rounded-2xl bg-accent-tint px-5 py-4 text-[15px] font-semibold text-accent-dark">Your page is not on the website yet: our team is checking your details. You can add your products now, and use &quot;See my page&quot; to see how it will look.</p> : null}
              <DashSteps steps={[["Add a product", "Its name, a few photos and the price."], ["We check it", "Our team looks at it, usually the same day."], ["Buyers see it", "It shows on your page and they call you."]]} />

              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
                {/* ── The main job: products ── */}
                <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
                  {editing ? (
                    <DashCard id="edit-product" Icon={Pencil} strong title={`Change ${editing.productName}`} note="Save it and our team checks it again.">
                      <Link href="/supplier" className="-mt-2 w-fit text-[14px] font-semibold">← Cancel, go back</Link>
                      <ProductForm supplierId={s.id} product={editing} input={input} label={label} />
                    </DashCard>
                  ) : (
                    <DashCard id="add-product" Icon={Plus} strong title="Add a product" note="Three quick questions. Only the name is needed.">
                      <ProductForm supplierId={s.id} input={input} label={label} />
                    </DashCard>
                  )}

                  <DashCard Icon={Package} title={`My products (${s.listings.length})`} note={s.listings.length ? "Tap Change to edit one, or Remove to take it off your page." : undefined}>
                    {s.listings.length === 0 ? (
                      <p className="rounded-2xl bg-page p-6 text-center text-[14px] text-ink-muted">You have no products yet. Add your first one above: it takes a minute.</p>
                    ) : (
                      <ul className="flex flex-col gap-2.5">
                        {s.listings.map((p) => {
                          const st = STATUS[(p.status in STATUS ? p.status : "IN_REVIEW") as keyof typeof STATUS];
                          const hasPrice = p.priceMin !== null || p.priceMax !== null;
                          return (
                            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
                              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                                {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Package aria-hidden className="h-6 w-6 text-brand/40" />}
                                {p.moreImages.length ? <span className="absolute bottom-0.5 right-0.5 rounded-full bg-black/70 px-1.5 text-[10px] font-bold text-white">+{p.moreImages.length}</span> : null}
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="truncate font-display text-[15px] font-bold text-heading">{p.productName}</span>
                                <span className="text-[13px] text-ink-soft">{hasPrice ? moneyRange(p.priceMin, p.priceMax, p.currency) : "No price"}{p.unit ? ` · ${p.unit}` : ""}</span>
                                <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}><st.Icon aria-hidden className="h-3 w-3" />{st.label}</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <Link href={`/supplier?edit=${p.id}#edit-product`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-heading hover:border-brand hover:text-brand"><Pencil aria-hidden className="h-3.5 w-3.5" />Change</Link>
                                <form>
                                  <input type="hidden" name="supplierId" value={s.id} /><input type="hidden" name="id" value={p.id} />
                                  <ConfirmButton action={deleteProduct} title={`Remove ${p.productName}?`} message="It comes off your page and from this list. This cannot be undone." plain className="h-10">Remove</ConfirmButton>
                                </form>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </DashCard>
                </div>

                {/* ── About the business: rarely changed, so it sits to the side ── */}
                <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
                  <DashCard Icon={Store} title="My business details" note="Shown at the top of your page. Phone and email are for members only.">
                    <form action={saveSupplierDetails} className="grid gap-3">
                      <input type="hidden" name="supplierId" value={s.id} />
                      <label className={label}>Where are you? (address)<input name="address" defaultValue={s.organization.locations[0]?.physicalAddress ?? ""} placeholder="e.g. Shop 12, Kikuubo Lane, Kampala" className={input} /></label>
                      <label className={label}>Phone buyers call<input name="phone" type="tel" defaultValue={s.phone ?? ""} placeholder="0772 123 456" className={input} /></label>
                      <label className={label}>Email (if you have one)<input name="email" type="email" defaultValue={s.email ?? ""} className={input} /></label>
                      <label className={label}>Country<input name="country" defaultValue={s.country ?? ""} className={input} /></label>
                      <label className={label}>Website (if you have one)<input name="website" type="url" defaultValue={s.website ?? ""} placeholder="https://" className={input} /></label>
                      <button className="btn-primary min-h-[48px] w-full px-5 text-[15px]">Save my details</button>
                    </form>
                  </DashCard>

                  <DashCard Icon={ImageIcon} title="My main photo" note="Your shop front, your products or your logo.">
                    <form action={saveSupplierPhoto} className="flex flex-col gap-3">
                      <input type="hidden" name="supplierId" value={s.id} />
                      <UploadButton target="pictureUrl" kind="image" />
                      <input name="pictureUrl" defaultValue={s.pictureUrl ?? ""} placeholder="Filled in after you upload" aria-label="Photo address" className={`${input} text-[13px] text-ink-muted`} />
                      <button className="btn-primary min-h-[48px] w-full px-5 text-[15px]">Save photo</button>
                    </form>
                  </DashCard>

                  <details className="rounded-3xl border border-line bg-white p-5 [&>summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center gap-3 font-display text-[16px] font-bold text-heading"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-page text-ink-soft"><KeyRound aria-hidden className="h-5 w-5" /></span>Change my PIN</summary>
                    <form action={changeMyPin} className="mt-4 flex flex-col gap-3">
                      <input type="hidden" name="back" value="/supplier" />
                      <label className={label}>New 4-digit PIN<input name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                      <label className={label}>Type it again<input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                      <button className="btn-outline min-h-[46px] w-full px-4 text-sm">Change PIN</button>
                    </form>
                  </details>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductForm({ supplierId, product, input, label }: {
  supplierId: string;
  product?: { id: string; productName: string; specifications: string | null; unit: string | null; minimumOrderQuantity: unknown; availability: string | null; priceMin: unknown; priceMax: unknown; imageUrl: string | null; moreImages: string[] };
  input: string;
  label: string;
}) {
  const num = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));
  // Three plain questions, numbered, with big boxes; everything else folds away under "More details".
  // Only the name is needed (client, 11 Nov 2026: as easy as possible for the supplier).
  const step = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[13px] font-bold text-white";
  const question = "flex items-center gap-2 font-display text-[15px] font-bold text-heading";
  const big = `${input} min-h-[52px] text-[16px]`;
  const more = Boolean(product && (product.priceMax !== null || product.unit || product.minimumOrderQuantity !== null || product.availability || product.specifications));
  return (
    <form action={saveProduct} className="mt-4 flex flex-col gap-5">
      <input type="hidden" name="supplierId" value={supplierId} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <label className="flex flex-col gap-2">
        <span className={question}><span className={step}>1</span>What is the product called?</span>
        <input name="productName" required minLength={2} maxLength={120} defaultValue={product?.productName} placeholder="e.g. Wheat flour 50 kg" className={big} />
      </label>

      <div className="flex flex-col gap-2">
        <span className={question}><span className={step}>2</span>Add photos <span className="font-sans text-[13px] font-normal text-ink-muted">(buyers look at photos first)</span></span>
        <ProductPhotos initial={[product?.imageUrl, ...(product?.moreImages ?? [])].filter((p): p is string => Boolean(p))} />
      </div>

      <label className="flex flex-col gap-2">
        <span className={question}><span className={step}>3</span>What is the price? <span className="font-sans text-[13px] font-normal text-ink-muted">(in UGX; leave empty if it changes)</span></span>
        <input name="priceMin" inputMode="numeric" defaultValue={num(product?.priceMin)} placeholder="e.g. 150,000" className={big} />
      </label>

      <details open={more} className="rounded-xl bg-page p-3 [&>summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-brand">+ More details (optional): pack size, minimum order, description</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={label}>Pack or unit<input name="unit" placeholder="e.g. piece, 50 kg bag" defaultValue={product?.unit ?? ""} className={input} /></label>
          <label className={label}>Smallest order<input name="minimumOrderQuantity" inputMode="numeric" placeholder="e.g. 10" defaultValue={num(product?.minimumOrderQuantity)} className={input} /></label>
          <label className={label}>Highest price, if the price is a range (UGX)<input name="priceMax" inputMode="numeric" defaultValue={num(product?.priceMax)} className={input} /></label>
          <label className={label}>Is it in stock?<input name="availability" placeholder="e.g. In stock, 2 weeks" defaultValue={product?.availability ?? ""} className={input} /></label>
          <label className={`${label} sm:col-span-2`}>Description<textarea name="specifications" rows={3} placeholder="Size, colour, brand, anything a buyer should know" defaultValue={product?.specifications ?? ""} className="input w-full py-2 text-[14px]" /></label>
        </div>
      </details>

      <div className="flex flex-col gap-1.5">
        <button className="btn-primary min-h-[52px] w-full px-6 text-[16px] sm:w-fit">{product ? "Save changes" : "Add this product"}</button>
        <span className="text-[12px] text-ink-muted">Our team checks it, then it shows on your page.</span>
      </div>
    </form>
  );
}
