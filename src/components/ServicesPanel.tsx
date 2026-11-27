import Link from "next/link";
import {
  ArrowRight, BookOpen, ChevronRight, Cog, FileText, Landmark, Lightbulb, MessagesSquare, TrendingUp, Truck, Users,
} from "lucide-react";

type Service = { href: string; title: string; text: string; icon: typeof Users; tone: string };

// Every service, each with its own colour (the set the fund cards take in turn). A page lists the others, in this order.
const SERVICES: Service[] = [
  { href: "/experts", title: "Find a business expert", text: "Advice from people who have done it", icon: Users, tone: "bg-[#EEF4FF] text-[#1D4ED8]" },
  { href: "/funding", title: "Loans and grants", text: "Funding that fits your business", icon: Landmark, tone: "bg-[#E9F7F5] text-[#0F766E]" },
  { href: "/tools", title: "Write your business plan", text: "Templates and calculators lenders ask for", icon: FileText, tone: "bg-[#F4EEFF] text-[#6D28D9]" },
  { href: "/guides", title: "Step-by-step guides", text: "How to register, apply and start", icon: BookOpen, tone: "bg-[#FFF5E6] text-[#B45309]" },
  { href: "/business-ideas", title: "Business ideas", text: "Ideas with plans and start-up costs", icon: Lightbulb, tone: "bg-[#FDEEF5] text-[#BE185D]" },
  { href: "/machines", title: "Business machines", text: "The machines to start and grow", icon: Cog, tone: "bg-[#EEF4FF] text-[#1D4ED8]" },
  { href: "/suppliers", title: "Trusted suppliers", text: "Stock and materials from checked sellers", icon: Truck, tone: "bg-[#E9F7F5] text-[#0F766E]" },
  { href: "/opportunities", title: "Find investors", text: "Projects and investors looking for partners", icon: TrendingUp, tone: "bg-[#F4EEFF] text-[#6D28D9]" },
  { href: "/forum", title: "Ask other owners", text: "Questions and answers in the Business Forum", icon: MessagesSquare, tone: "bg-[#FDEEF5] text-[#BE185D]" },
];

// The big card's offer on each page; the experts page invites experts to join instead
const FEATURE: Record<string, { title: string; text: string; href?: string; button?: string }> = {
  "/funding": { title: "Find an expert to help you choose and apply for a loan", text: "A business expert can match you with the right fund and get your papers ready." },
  "/opportunities": { title: "Find an expert to check a project before you invest", text: "Get a second opinion on the numbers, the people and the risks." },
  "/machines": { title: "Find an expert to help you choose the right machine", text: "Match the machine to your plan, your space and your budget." },
  "/suppliers": { title: "Find an expert to help you compare suppliers", text: "Check prices, terms and quality before you buy in bulk." },
  "/business-ideas": { title: "Find an expert to help you start your business", text: "Turn an idea into a plan, a budget and your first customers." },
  "/tools": { title: "Find an expert to help you write your business plan", text: "Get a plan lenders and investors will take seriously." },
  "/guides": { title: "Find an expert to take you through each step", text: "Registration, licences, tax and more, done right the first time." },
  "/experts": { title: "Are you a business expert?", text: "Join BizSphere-Ug and meet business owners who need your help.", href: "/experts/join", button: "Join as an expert" },
};
const DEFAULT_FEATURE = { title: "Find an expert to help you grow your business", text: "A business expert can help you choose well and get started." };

/**
 * The services panel on every directory page (client, 26 Nov 2026; first on Funding Sources): a big card offering a
 * business expert for what this page is about, and the site's other services, each leading to its page. A side
 * column beside row lists; `row` lays it out as a band under photo grids and tables, which need the full width.
 */
export function ServicesPanel({ path, row = false }: { path: string; row?: boolean }) {
  const f = { href: "/experts", button: "Find an expert", ...(FEATURE[path] ?? DEFAULT_FEATURE) };
  const others = SERVICES.filter((s) => s.href !== path && s.href !== f.href).slice(0, row ? 6 : 5);
  return (
    <aside aria-labelledby="services" className={row ? "grid grid-cols-[minmax(0,1fr)] gap-2.5 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "flex flex-col gap-2.5 lg:sticky lg:top-[calc(var(--hh)+6.5rem)]"}>
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-navy p-5 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFCF1A]/15 blur-2xl" />
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFCF1A]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#FFCF1A]" />Our services
        </span>
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#FFCF1A]"><Users className="h-5 w-5" /></span>
        <h3 id="services" className="text-[17px] font-bold leading-tight tracking-[-0.02em] text-white">{f.title}</h3>
        <p data-size="" className="text-[12.5px] leading-relaxed text-white/75">{f.text}</p>
        <Link href={f.href} className="group mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FFCF1A] px-4 text-[12.5px] font-bold text-ink transition-colors hover:bg-[#FFDB52] hover:text-ink">
          {f.button}<ArrowRight aria-hidden className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <nav aria-label="More services" className="overflow-hidden rounded-2xl border border-line bg-white">
        <p className="px-4 pb-1 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">More ways we help</p>
        <ul className={row ? "grid grid-cols-[minmax(0,1fr)] p-1.5 sm:grid-cols-2" : "flex flex-col p-1.5"}>
          {others.map(({ href, title, text, icon: ServiceIcon, tone }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 rounded-xl p-2.5 text-ink transition-colors hover:bg-page hover:text-ink">
                <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><ServiceIcon className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-bold leading-tight tracking-[-0.01em] text-heading">{title}</span>
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
