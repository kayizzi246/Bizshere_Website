import Link from "next/link";
import { H2, StaticPage } from "@/components/StaticPage";

export const metadata = { title: "Content methodology" };

export default function MethodologyPage() {
  return (
    <StaticPage title="How we research and check information" intro="What our dates, checks and labels mean, so you can decide how much to rely on each page.">
      <H2>Sources and dates</H2>
      <p>Each page lists its sources and the date we last reviewed it, plus when the next review is due. Prices, quotes and budgets show the date they were collected, because they go out of date.</p>

      <H2>Specific checks, not a general &ldquo;verified&rdquo;</H2>
      <p>When we check something we record what we checked, when, and who checked it. You will see labels such as:</p>
      <ul className="list-disc pl-5">
        <li><strong>Business contact checked on [date]</strong>: we reached the business on the listed phone or email.</li>
        <li><strong>Registration checked on [date]</strong>: we saw evidence the business is registered.</li>
        <li><strong>Terms checked against official source on [date]</strong>: funding or fee terms match the provider&apos;s published terms.</li>
      </ul>
      <p>A checked contact does not guarantee product quality, delivery or a good outcome. Always confirm terms directly before paying.</p>

      <H2>Unknown is shown as unknown</H2>
      <p>If we don&apos;t have a figure we say so (&ldquo;to be confirmed&rdquo; or &ldquo;awaiting sourced quote&rdquo;). We never show an unknown amount as zero. Totals are only shown when every line has a sourced figure.</p>

      <H2>Facts, explanations, estimates and claims</H2>
      <p>We keep four kinds of information apart and label them:</p>
      <ul className="list-disc pl-5">
        <li><strong>Source</strong>: taken from an official or primary source.</li>
        <li><strong>Editor note</strong>: our plain-language explanation.</li>
        <li><strong>Estimate</strong>: our calculation, with its assumptions shown.</li>
        <li><strong>Promoter claim</strong>: what an investment promoter says. Projected returns are claims, not established outcomes.</li>
      </ul>

      <H2>Prices</H2>
      <p>Market prices are dated observations, not live prices. We only compare prices for the same product grade and the same unit (for example, a 50 kg bag of Grade 1 flour). Older prices are marked &ldquo;may be out of date&rdquo;.</p>

      <H2>Funding amounts</H2>
      <p>We show a funding amount or range. The upper figure is a ceiling the provider advertises, not an amount any applicant is guaranteed.</p>

      <H2>Businesses that list themselves</H2>
      <p>Businesses can submit their own listings and offers. Nothing a business submits goes live until an editor has reviewed it.</p>

      <H2>Corrections</H2>
      <p>If something is wrong, <Link href="/corrections">report a correction</Link>. An editor checks it against the source, and the page&apos;s review date updates when it changes.</p>
    </StaticPage>
  );
}
