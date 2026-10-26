import Link from "next/link";
import { H2, StaticPage } from "@/components/StaticPage";
import { site } from "@/config/site";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <StaticPage title={`About ${site.name}`} intro={site.tagline}>
      <p>
        {site.name} is a business information platform for Uganda. It helps you move from a business idea to the machines,
        suppliers, funding, guidance and expertise you need to start, and links them together so you don&apos;t have to search
        ten places.
      </p>
      <H2>What you will find</H2>
      <ul className="list-disc pl-5">
        <li><Link href="/business-ideas">Business ideas and plans</Link> with dated startup budgets</li>
        <li><Link href="/machines">Machines</Link> and <Link href="/suppliers">suppliers</Link>, with offers from different sellers</li>
        <li><Link href="/funding">Funding programmes</Link> and <Link href="/opportunities">investment opportunities</Link></li>
        <li><Link href="/guides">Guides</Link>, <Link href="/tools">tools and templates</Link>, <Link href="/recipes">recipes</Link> and <Link href="/websites">useful websites</Link></li>
        <li><Link href="/prices">Market prices</Link>, each with the date it was observed</li>
        <li><Link href="/experts">Consultants and experts</Link></li>
        <li><Link href="/news">Business news</Link> that affects what you should do next</li>
      </ul>
      <H2>How we work</H2>
      <p>
        Every budget, price and contact shows where it came from and when it was last checked. We say exactly what we checked
        (for example &ldquo;business contact checked on 12 March 2026&rdquo;) instead of a general &ldquo;verified&rdquo; badge.
        Read the full <Link href="/methodology">content methodology</Link>.
      </p>
    </StaticPage>
  );
}
