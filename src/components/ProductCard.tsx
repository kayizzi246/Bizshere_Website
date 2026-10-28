import Link from "next/link";
import { Check, Download, FileText, LockKeyhole } from "lucide-react";

/**
 * A downloadable guide, book, template or tool shown as a digital product: file type,
 * key facts and one clear action. Gated pages pass `href: null` and `locked: true`, so
 * the file address never reaches a visitor; the button opens the onboarding pop-up.
 */
export type Product = {
  /** What it is, e.g. "Book", "Template". */
  kind: string;
  title: string;
  href?: string | null;
  locked: boolean;
  /** File type badge; worked out from the link when not given. */
  format?: string | null;
  facts: [string, string | null | undefined][];
  /** Extra action, e.g. an online calculator. */
  secondary?: { label: string; href: string } | null;
};

const fromUrl = (href?: string | null) => href?.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i)?.[1]?.toUpperCase() ?? null;

export const productFormat = (p: Product) => (p.format || fromUrl(p.href) || p.kind).slice(0, 5).toUpperCase();

/** The one action for a product: download for members, unlock for visitors. */
export function ProductAction({ product, back, className = "" }: { product: Product; back: string; className?: string }) {
  const base = `inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-display text-sm font-semibold ${className}`;
  if (product.locked) {
    return (
      <Link href={back} data-onboard="" className={`${base} bg-brand-deep text-white hover:bg-brand hover:text-white`}>
        <LockKeyhole aria-hidden className="h-4 w-4" />Unlock to download
      </Link>
    );
  }
  if (!product.href) return <p className="rounded-xl bg-page p-3 text-center text-xs text-ink-muted">The file is being prepared.</p>;
  return (
    <a href={product.href} target="_blank" rel="noopener noreferrer" download className={`${base} bg-accent text-ink hover:bg-brand-deep hover:text-white`}>
      <Download aria-hidden className="h-4 w-4" />Download {productFormat(product)}
    </a>
  );
}

export function ProductCard({ product, back, price }: { product: Product; back: string; price?: string | null }) {
  const format = productFormat(product);
  const facts = product.facts.filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-4 bg-gradient-to-br from-brand to-brand-deep p-5 text-white">
        {/* File tile with its type */}
        <span className="relative flex h-16 w-[52px] shrink-0 flex-col items-center justify-end rounded-lg bg-white pb-1.5 text-heading">
          <span aria-hidden className="absolute right-0 top-0 h-3.5 w-3.5 rounded-bl-md bg-brand-tint" />
          <FileText aria-hidden className="absolute top-2.5 h-5 w-5 text-brand" strokeWidth={1.75} />
          <span className="rounded bg-accent px-1 text-[9px] font-black tracking-wide text-ink">{format}</span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Digital {product.kind.toLowerCase()}</span>
          <span className="line-clamp-2 font-display text-sm font-bold leading-tight">{product.title}</span>
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {facts.length ? (
          <dl className="flex flex-col divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 text-[13px]">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <ul className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
          <li className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 text-brand" />Download straight away</li>
          <li className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 text-brand" />Included with membership</li>
        </ul>

        <div className="flex flex-col gap-2">
          <ProductAction product={product} back={back} />
          {product.locked ? <p className="text-center text-xs text-ink-muted">{price ? `${price} a month · ` : ""}every download on the site</p> : null}
        </div>

        {product.secondary ? (
          <Link href={product.secondary.href} className="inline-flex h-12 items-center justify-center rounded-[10px] border border-line text-sm font-semibold text-heading hover:border-brand hover:text-brand">
            {product.secondary.label} →
          </Link>
        ) : null}
      </div>
    </section>
  );
}
