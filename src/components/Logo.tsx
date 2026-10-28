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
        <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} priority className="h-14 w-auto" />
      </Link>
    );
  }
  return (
    <Link href={href} className={`flex items-center gap-2 font-display text-[17px] font-extrabold tracking-tight ${light ? "text-white hover:text-white" : "text-brand hover:text-brand"}`}>
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
