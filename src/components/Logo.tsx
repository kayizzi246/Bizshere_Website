import Link from "next/link";

// Placeholder mark until the client sends the real logo (request item A1).
export function Logo({ href = "/", light = false, sub }: { href?: string; light?: boolean; sub?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 text-xl font-extrabold tracking-tight ${light ? "text-white hover:text-white" : "text-ink hover:text-ink"}`}>
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand text-lg text-white">B</span>
      <span className="flex flex-col leading-tight">
        <span>
          BizSphere<span className={light ? "text-brand-mint" : "text-brand"}>-Ug</span>
        </span>
        {sub ? <span className="text-xs font-semibold text-brand-mint">{sub}</span> : null}
      </span>
    </Link>
  );
}
