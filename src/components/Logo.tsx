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
        {/* 48/50px (17 Nov 2026). 42px still read small on a phone, and it could not grow inside a
            48px bar — so the phone bar went to 56px (SiteHeader, --hh) and the logo with it. Both
            sizes now leave 3-4px of air top and bottom inside the 56px bar. */}
        <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} priority data-nofit="" className="h-[52px] w-auto lg:h-[60px]" />
      </Link>
    );
  }
  return (
    <Link href={href} className={`flex items-center gap-2 font-display text-[16px] font-bold tracking-tight ${light ? "text-white hover:text-white" : "text-brand hover:text-brand"}`}>
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
