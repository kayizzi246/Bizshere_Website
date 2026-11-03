import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink, Package, Plus, Settings, Trash2, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moneyRange } from "@/lib/format";
import { UploadButton } from "@/components/UploadButton";
import { SignOutButton } from "@/components/SignOutButton";
import { deleteProduct, saveProduct, saveSupplierPhoto } from "@/app/actions/supplier";
import { changeMyPin } from "@/app/actions/pin";
import { ChoosePin } from "@/components/ChoosePin";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller dashboard", robots: { index: false } };

const NOTICE: Record<string, string> = {
  password: "Your PIN is changed.",
  photo: "Your photo is saved.",
  added: "Product sent. It will show on your page once our team approves it.",
  updated: "Changes sent. The product shows again once our team approves them.",
  deleted: "Product removed.",
};
const ERROR: Record<string, string> = {
  password: "Enter the same 4-digit PIN twice.",
  access: "You can only change your own listing.",
  photo: "Use the Upload button, or an address starting with https://.",
  product: "Check the product: it needs a name, and prices must be numbers.",
};

// What each product status means to a seller, in plain words.
const STATUS = {
  PUBLISHED: { label: "On your page", cls: "bg-[#E6F4EC] text-[#1F7A4D]", Icon: CheckCircle2 },
  IN_REVIEW: { label: "Waiting for approval", cls: "bg-accent-tint text-accent-dark", Icon: Clock },
  ARCHIVED: { label: "Not approved", cls: "bg-bad-bg text-bad-fg", Icon: XCircle },
} as const;
const statusOf = (s: string) => STATUS[(s in STATUS ? s : "IN_REVIEW") as keyof typeof STATUS];

/**
 * Seller dashboard (/supplier): a seller signs in at /suppliers/login with their phone and PIN.
 * They add products (shown once the team approves them at /admin/seller-products), see each
 * product's status, and change their photo and PIN. Access comes from the admin linking their
 * phone to the supplier (/admin/supplier-logins); the actions check it again on every change.
 */
export default async function SupplierPortal({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const session = await getSession();
  // Signed out: the seller sign-in page (phone and PIN).
  if (!session?.user?.id) redirect("/suppliers/login");
  // First sign-in with a texted PIN (or one the team reset): choose your own before anything else.
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pinMustChange: true } });
  if (me?.pinMustChange) return <ChoosePin back="/supplier" error={searchParams.error === "password"} />;
  const suppliers = await prisma.supplier.findMany({
    where: { organization: { members: { some: { userId: session.user.id } } } },
    include: { contentItem: { select: { title: true, slug: true } }, listings: { orderBy: { createdAt: "desc" } } },
  });

  const input = "input min-h-[44px] w-full text-[14px]";
  const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-soft";
  const signOut = <span className="w-32"><SignOutButton to="/supplier" className="border border-line bg-white text-ink-soft hover:border-brand" /></span>;

  if (suppliers.length === 0) {
    return (
      <div className="bg-page"><div className="container-site py-8">
        <section className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h1 className="font-display text-xl font-extrabold text-heading">This account isn&apos;t registered as a seller</h1>
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
    <div className="bg-page">
      <div className="container-site flex flex-col gap-5 py-5 sm:py-7">
        {searchParams.saved && NOTICE[searchParams.saved] ? <p role="status" className="rounded-xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">{NOTICE[searchParams.saved]}</p> : null}
        {searchParams.error && ERROR[searchParams.error] ? <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error]}</p> : null}

        {suppliers.map((s) => {
          const name = s.contentItem.title.replace(/^Sample:\s*/i, "");
          const count = (st: string) => s.listings.filter((l) => l.status === st).length;
          return (
            <section key={s.id} className="flex flex-col gap-5">
              {/* ── Who and where ── */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    {s.pictureUrl ? <img src={s.pictureUrl} alt="" className="h-full w-full object-cover" /> : <Package aria-hidden className="h-6 w-6 text-brand/40" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Seller dashboard</span>
                    <h1 className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-heading sm:text-[28px]">{name}</h1>
                  </span>
                </div>
                <span className="flex items-center gap-2">
                  <Link href={`/suppliers/${s.contentItem.slug}`} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-heading hover:border-brand hover:text-brand"><ExternalLink aria-hidden className="h-4 w-4" />View my page</Link>
                  {signOut}
                </span>
              </div>

              {/* ── At a glance ── */}
              <ul className="grid grid-cols-3 gap-2 sm:gap-3">
                {(["PUBLISHED", "IN_REVIEW", "ARCHIVED"] as const).map((st) => {
                  const { label: l, cls, Icon } = STATUS[st];
                  return (
                    <li key={st} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3 sm:p-4">
                      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold sm:text-[12px] ${cls}`}><Icon aria-hidden className="h-3.5 w-3.5" />{l}</span>
                      <span className="font-display text-[26px] font-extrabold text-heading">{count(st)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="-mt-2 text-[13px] text-ink-muted">How it works: add a product → our team checks it → it shows on your page. Changing a product sends it for checking again.</p>

              {/* ── Add a product ── */}
              <details className="group rounded-2xl border-2 border-brand/30 bg-white p-4" open={s.listings.length === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-base font-extrabold text-brand [&::-webkit-details-marker]:hidden">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><Plus aria-hidden className="h-4 w-4" /></span>Add a product
                </summary>
                <ProductForm supplierId={s.id} input={input} label={label} />
              </details>

              {/* ── My products ── */}
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-lg font-extrabold text-heading">My products ({s.listings.length})</h2>
                {s.listings.length === 0 ? <p className="text-sm text-ink-muted">No products yet. Add your first one above.</p> : null}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {s.listings.map((p) => {
                    const st = statusOf(p.status);
                    return (
                      <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                        <div className="relative flex aspect-square items-center justify-center bg-page">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package aria-hidden className="h-8 w-8 text-brand/40" />}
                          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}><st.Icon aria-hidden className="h-3 w-3" />{st.label}</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <span className="line-clamp-2 text-[14px] font-semibold text-heading">{p.productName}</span>
                          <span className="text-[13px] font-bold text-brand-dark">{p.priceMin !== null || p.priceMax !== null ? moneyRange(p.priceMin, p.priceMax, p.currency) : "No price"}{p.unit ? <span className="font-normal text-ink-muted"> / {p.unit}</span> : null}</span>
                          <details className="mt-auto pt-1">
                            <summary className="cursor-pointer list-none text-[13px] font-semibold text-brand [&::-webkit-details-marker]:hidden">Edit</summary>
                            <ProductForm supplierId={s.id} product={p} input={input} label={label} />
                          </details>
                          <form action={deleteProduct}>
                            <input type="hidden" name="supplierId" value={s.id} /><input type="hidden" name="id" value={p.id} />
                            <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-bad-fg"><Trash2 aria-hidden className="h-3.5 w-3.5" />Remove</button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ── Settings: photo and PIN, out of the way ── */}
              <details className="rounded-2xl border border-line bg-white p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-soft [&::-webkit-details-marker]:hidden"><Settings aria-hidden className="h-4 w-4" />Settings: my photo and PIN</summary>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <form action={saveSupplierPhoto} className="flex flex-col gap-2">
                    <input type="hidden" name="supplierId" value={s.id} />
                    <label className={label}>Main photo (shop front, products or logo)
                      <input name="pictureUrl" defaultValue={s.pictureUrl ?? ""} placeholder="Upload, or paste an https:// address" className={input} />
                    </label>
                    <UploadButton target="pictureUrl" kind="image" />
                    <button className="btn-primary min-h-[40px] w-fit px-4 text-sm">Save photo</button>
                  </form>
                  <form action={changeMyPin} className="flex flex-col gap-2">
                    <input type="hidden" name="back" value="/supplier" />
                    <label className={label}>New 4-digit PIN<input name="password" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                    <label className={label}>Repeat it<input name="confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required autoComplete="new-password" className={`${input} tracking-[0.5em]`} /></label>
                    <button className="btn-primary min-h-[40px] w-fit px-4 text-sm">Change PIN</button>
                  </form>
                </div>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProductForm({ supplierId, product, input, label }: {
  supplierId: string;
  product?: { id: string; productName: string; specifications: string | null; unit: string | null; availability: string | null; priceMin: unknown; priceMax: unknown; imageUrl: string | null };
  input: string;
  label: string;
}) {
  const num = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return (
    <form action={saveProduct} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="supplierId" value={supplierId} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className={`${label} sm:col-span-2`}>Product name<input name="productName" required defaultValue={product?.productName} className={input} /></label>
      <label className={`${label} sm:col-span-2`}>Photo
        <input name="imageUrl" defaultValue={product?.imageUrl ?? ""} placeholder="Upload, or paste an https:// address" className={input} />
      </label>
      <div className="sm:col-span-2"><UploadButton target="imageUrl" kind="image" /></div>
      <label className={label}>Price from (UGX)<input name="priceMin" inputMode="numeric" defaultValue={num(product?.priceMin)} className={input} /></label>
      <label className={label}>Price to (UGX, optional)<input name="priceMax" inputMode="numeric" defaultValue={num(product?.priceMax)} className={input} /></label>
      <label className={label}>Unit<input name="unit" placeholder="e.g. piece, 50 kg bag" defaultValue={product?.unit ?? ""} className={input} /></label>
      <label className={label}>Availability<input name="availability" placeholder="e.g. In stock, 2 weeks" defaultValue={product?.availability ?? ""} className={input} /></label>
      <label className={`${label} sm:col-span-2`}>Description<textarea name="specifications" rows={3} defaultValue={product?.specifications ?? ""} className="input w-full py-2 text-[14px]" /></label>
      <button className="btn-primary min-h-[44px] px-5 text-sm sm:col-span-2 sm:w-fit">{product ? "Save and send for approval" : "Send for approval"}</button>
    </form>
  );
}

