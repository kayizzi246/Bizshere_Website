import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, FileText, Lightbulb, MessagesSquare, TrendingUp, Users } from "lucide-react";

// Each service row gets its own colour, the same set the fund cards take in turn
const SERVICES: { href: string; title: string; text: string; icon: typeof Users; tone: string }[] = [
  { href: "/tools", title: "Write your business plan", text: "Templates and calculators lenders ask for", icon: FileText, tone: "bg-[#EEF4FF] text-[#1D4ED8]" },
  { href: "/guides", title: "Step-by-step guides", text: "How to apply for a loan or a grant", icon: BookOpen, tone: "bg-[#E9F7F5] text-[#0F766E]" },
  { href: "/opportunities", title: "Find investors", text: "Projects and investors looking for partners", icon: TrendingUp, tone: "bg-[#F4EEFF] text-[#6D28D9]" },
  { href: "/business-ideas", title: "Business ideas", text: "Ideas with plans and start-up costs", icon: Lightbulb, tone: "bg-[#FFF5E6] text-[#B45309]" },
  { href: "/forum", title: "Ask other owners", text: "Questions and answers in the Business Forum", icon: MessagesSquare, tone: "bg-[#FDEEF5] text-[#BE185D]" },
];

/**
 * The side column on Funding Sources (client, 26 Nov 2026): the site's services that help someone get funded, each
 * leading to its page. First and largest: an expert to help choose a fund and apply.
 */
export function FundingServices() {
  return (
    <aside aria-labelledby="services" className="flex flex-col gap-2.5 lg:sticky lg:top-[calc(var(--hh)+6.5rem)]">
      <div className="lift relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-navy p-5 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFCF1A]/15 blur-2xl" />
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFCF1A]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FFCF1A]" />Our services
        </span>
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#FFCF1A]"><Users className="h-5 w-5" /></span>
        <h3 id="services" className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-white">Find an expert to help you choose and apply for a loan</h3>
        <p data-size="" className="text-[13px] leading-relaxed text-white/75">A business expert can match you with the right fund and get your papers ready.</p>
        <Link href="/experts" className="group mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFCF1A] px-4 text-[13px] font-bold text-ink transition-colors hover:bg-[#FFDB52] hover:text-ink">
          Find an expert<ArrowRight aria-hidden className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <nav aria-label="More services" className="lift overflow-hidden rounded-2xl border border-line bg-white">
        <p className="px-4 pb-1 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">More ways we help</p>
        <ul className="flex flex-col p-1.5">
          {SERVICES.map(({ href, title, text, icon: ServiceIcon, tone }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 rounded-xl p-2.5 text-ink transition-colors hover:bg-page hover:text-ink">
                <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><ServiceIcon className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-bold leading-tight tracking-[-0.01em] text-heading">{title}</span>
                  <span className="truncate text-[12px] text-ink-muted">{text}</span>
                </span>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-heading" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
