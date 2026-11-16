import Image from "next/image";
import Link from "next/link";

/**
 * `full`: the client's logo as supplied (public/brand/logo-full.png), shown small; used in the site header.
 * Otherwise the "B" mark cropped from it with the name set in text, for dark panels such as the admin sidebar.
 */
export function Logo({ href = "/", light = false, sub, full = false }: { href?: string; light?: boolean; sub?: string; full?: boolean }) {
  if (full) {
    return (
      <Link href={href} aria-label="BizSphere-Ug home" className="shrink-0">
        {/* data-nofit: the logo is a transparent cut-out, so it must not get ImageFit's grey plate (client, 14 Nov 2026) */}
        {/* 36/42px (16 Nov 2026). It was 48/56 — the full height of the header bar, so it met both
            edges — then briefly 32/36, which read small. This keeps a few pixels of air top and
            bottom inside the 48/56px bar. */}
        <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} priority data-nofit="" className="h-[36px] w-auto lg:h-[42px]" />
      </Link>
    );
  }
  return (
    <Link href={href} className={`flex items-center gap-2 font-display text-[17px] font-bold tracking-tight ${light ? "text-white hover:text-white" : "text-brand hover:text-brand"}`}>
      <Image src="/brand/mark.png" alt="" width={32} height={32} priority className="h-8 w-8" />
      <span className="flex flex-col leading-tight">
        <span>
          BizSphere<span className="text-accent">-Ug</span>
        </span>
        {sub ? <span className="text-xs font-semibold text-brand-mint">{sub}</span> : null}
      </span>
    </Link>
  );
}
