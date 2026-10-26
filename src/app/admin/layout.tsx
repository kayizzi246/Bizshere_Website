import { Logo } from "@/components/Logo";
import { SideNav } from "@/components/SideNav";
import { requireStaff } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [pending, corrections] = await Promise.all([
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.correctionReport.count({ where: { status: "PENDING" } }),
  ]);
  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-[#F3F4F1]">
      <aside className="flex max-w-full flex-[1_1_250px] flex-col gap-4 bg-brand-admin px-3.5 py-5 text-[#C9DDD0]">
        <div className="px-2"><Logo href="/admin" light sub="Admin" /></div>
        <SideNav dark items={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/review", label: "Review queue", badge: pending },
          { href: "/admin/corrections", label: "Corrections", badge: corrections },
          { section: "Content" },
          { href: "/admin/content/new", label: "Add content" },
          { href: "/admin/content", label: "All content" },
          { href: "/admin/content?type=BUSINESS_IDEA", label: "Business ideas" },
          { href: "/admin/content?type=MACHINE", label: "Machines and offers" },
          { href: "/admin/content?type=FUNDING_PROGRAMME", label: "Funding" },
          { href: "/admin/prices", label: "Market prices" },
          { section: "People" },
          { href: "/admin/users", label: "Users and businesses" },
          { section: "Site" },
          { href: "/", label: "View website" },
        ]} />
        <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-[#173A29] p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E5A43] text-sm font-extrabold text-white">{(user.name ?? "A").slice(0, 2).toUpperCase()}</span>
          <span className="flex flex-col"><span className="text-sm font-bold text-white">{user.name}</span><span className="text-xs capitalize text-brand-mint">{user.role.toLowerCase()}</span></span>
        </div>
      </aside>
      <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 px-8 pb-14 pt-6">{children}</main>
    </div>
  );
}
