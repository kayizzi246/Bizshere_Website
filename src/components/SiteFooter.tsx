import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-deep text-[#D7E6DC]">
      <div className="container-site flex flex-wrap gap-10 py-12">
        <div className="flex flex-[2_1_280px] flex-col gap-2.5">
          <span className="text-xl font-extrabold text-white">BizSphere-Ug</span>
          <p className="max-w-sm text-sm leading-relaxed">From business idea to machines, suppliers, funding and expert help, in one place.</p>
        </div>
        <FooterCol title="Directories" links={[["/business-ideas", "Business ideas"], ["/machines", "Machines"], ["/suppliers", "Suppliers"], ["/funding", "Funding"], ["/prices", "Market prices"]]} />
        <FooterCol title="Resources" links={[["/guides", "Guides"], ["/tools", "Tools and templates"], ["/recipes", "Recipes"], ["/websites", "Useful websites"], ["/news", "Business news"], ["/opportunities", "Investment opportunities"], ["/experts", "Experts"]]} />
        <FooterCol title="Company" links={[["/about", "About"], ["/membership", "Membership"], ["/join", "List your business"], ["/contact", "Contact"], ["/corrections", "Corrections"], ["/methodology", "Content methodology"]]} />
      </div>
      <div className="container-site flex flex-wrap justify-between gap-4 border-t border-[#2A5A41] py-5 text-xs text-[#A9C4B3]">
        <span>© {new Date().getFullYear()} BizSphere-Ug</span>
        <span className="flex gap-3"><Link href="/terms" className="text-[#A9C4B3] hover:text-white">Terms</Link><Link href="/privacy" className="text-[#A9C4B3] hover:text-white">Privacy and data protection</Link></span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-[1_1_160px] flex-col gap-2.5 text-sm">
      <span className="font-bold text-white">{title}</span>
      {links.map(([href, label]) => (
        <Link key={label} href={href} className="text-[#D7E6DC] hover:text-white">{label}</Link>
      ))}
    </div>
  );
}
