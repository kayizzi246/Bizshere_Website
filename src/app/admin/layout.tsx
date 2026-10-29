import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { MobileNav, SideNav, type NavItem } from "@/components/SideNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavProgress } from "@/components/NavProgress";
import { SignOutButton } from "@/components/SignOutButton";
import { requireStaff } from "@/lib/access";
import { ADMIN_DIRECTORIES } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { prisma } from "@/lib/prisma";

const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "opportunity" : "link");

/**
 * Admin shell. Desktop: a blue sidebar (directories folded into one group) and a top bar with
 * search and the light/dark switch. Phones and tablets: the sidebar becomes a menu button.
 * The theme is remembered in the `admin-theme` cookie.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [pending, corrections, pendingPayments] = await Promise.all([
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.correctionReport.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
  ]);
  const theme = cookies().get("admin-theme")?.value === "dark" ? "dark" : "light";
  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/payments", label: "Payments", badge: pendingPayments, icon: "wallet" },
    { href: "/admin/review", label: "Review queue", badge: pending, icon: "inbox" },
    { href: "/admin/corrections", label: "Corrections", badge: corrections, icon: "flag" },
    { section: "Content" },
    { href: "/admin/content", label: "All content", icon: "files" },
    { group: "Directories", icon: "idea", items: ADMIN_DIRECTORIES.map((d) => ({ href: `/admin/content?type=${d.type}`, label: d.label, icon: iconOf(d.type) })) },
    { href: "/admin/prices", label: "Market prices", icon: "prices" },
    { section: "People and site" },
    { href: "/admin/users", label: "Users and businesses", icon: "users" },
    { href: "/admin/updates", label: "Homepage updates", icon: "megaphone" },
    { href: "/admin/video", label: "Homepage video", icon: "video" },
  ];
  const initials = (user.name ?? "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const userCard = (
    <div className="flex items-center gap-3 px-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">{initials}</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[13px] font-semibold text-white">{user.name}</span>
        <span className="text-[11px] capitalize text-white/50">{user.role.toLowerCase()}</span>
      </span>
    </div>
  );

  return (
    <div id="admin-shell" className={`min-h-screen bg-page text-ink lg:flex ${theme === "dark" ? "theme-dark" : ""}`}>
      <Suspense fallback={null}><NavProgress /></Suspense>
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[260px] lg:shrink-0 lg:flex-col lg:bg-brand-deep">
        <div className="flex h-16 items-center gap-2 px-5">
          <Logo href="/admin" light sub="Admin" />
        </div>
        <Link href="/admin/content/new" className="mx-4 mb-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[13px] font-semibold text-ink hover:bg-white hover:text-ink">
          <Icon name="plus" className="h-4 w-4" />Add content
        </Link>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <Suspense fallback={null}><SideNav items={items} dark /></Suspense>
        </div>
        <div className="flex flex-col gap-1 border-t border-white/10 p-3">
          <ThemeToggle initial={theme} withLabel />
          <Link href="/" target="_blank" className="flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white">
            <Icon name="external" className="h-4 w-4" />View website
          </Link>
          <div className="mt-1 rounded-xl bg-white/[0.06] p-2.5">{userCard}</div>
          <SignOutButton className="text-white/70 hover:bg-white/[0.06] hover:text-white" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Solid, not frosted: a backdrop filter would trap the phone menu panel inside this bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6 lg:h-16 lg:px-7">
          <Suspense fallback={null}><MobileNav items={items} footer={<>{userCard}<SignOutButton className="mt-3 text-white/70 hover:bg-white/[0.06] hover:text-white" /></>} /></Suspense>
          <span className="lg:hidden"><Logo full href="/admin" /></span>
          <form action="/admin/content" role="search" className="ml-auto hidden h-11 w-full max-w-md items-center gap-2 rounded-[10px] border border-line bg-page px-4 focus-within:border-brand focus-within:bg-surface sm:flex lg:ml-0">
            <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
            <input name="q" type="search" placeholder="Search content…" aria-label="Search content" className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle initial={theme} />
            <Link href="/admin/content/new" aria-label="Add content" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-deep hover:text-white lg:hidden">
              <Icon name="plus" className="h-4 w-4" />
            </Link>
          </div>
        </header>
        {/* Left-aligned to the sidebar (no centring), so wide screens don't open a gap beside it */}
        <main className="flex w-full min-w-0 max-w-[1600px] flex-col gap-6 px-4 pb-20 pt-6 sm:px-6 lg:gap-7 lg:px-7 lg:pt-7">{children}</main>
      </div>
    </div>
  );
}
