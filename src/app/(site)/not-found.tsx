import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { Icon } from "@/components/Icon";

/**
 * "Page not found" for the public site (client, 11 Nov 2026: a visitor who lands on a wrong or old link
 * must still find what they came for, not a bare "404"). It says what happened in plain words, offers the
 * search box first, then every part of the site, and a way to reach a person.
 */
export default function NotFound() {
  return (
    <div className="bg-[#F1F4F8]">
      <div className="container-site flex flex-col items-center gap-8 py-12 sm:py-16">
        <div className="flex max-w-xl flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft">Page not found</span>
          <h1 className="text-hero text-[28px] leading-[1.15] text-black sm:text-[36px]">We couldn&apos;t find that page</h1>
          <p className="text-[15px] leading-relaxed text-ink-soft">The link may be old, or the page may not be on the website yet. Search for what you need, or pick a section below.</p>
        </div>

        <form action="/search" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-2xl border-2 border-brand bg-white p-1.5">
          <Icon name="search" className="ml-3 h-5 w-5 shrink-0 text-ink-muted" />
          <input name="q" type="search" placeholder="What are you looking for? e.g. bakery, loan, flour" aria-label="Search the website" className="h-12 w-full min-w-0 bg-transparent text-[16px] text-ink outline-none" />
          <button className="btn-primary min-h-[48px] shrink-0 rounded-xl px-5 text-[15px]">Search</button>
        </form>

        <ul className="grid w-full max-w-4xl grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {DIRECTORIES.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="group flex h-full items-center gap-3 rounded-2xl bg-white p-3 text-ink transition-colors hover:bg-brand-tint hover:text-ink">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} className="h-5 w-5" /></span>
                <span className="font-display text-[14px] font-bold leading-tight text-heading">{d.title}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[14px] text-ink-soft">
          <Link href="/" className="font-semibold">← Back to the homepage</Link>
          <span aria-hidden>·</span>
          <span>Still stuck? <Link href="/contact" className="font-semibold">Tell us what you need</Link> and a person will help you.</span>
        </p>
      </div>
    </div>
  );
}
