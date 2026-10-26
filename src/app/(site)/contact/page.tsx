import { Fragment } from "react";
import Link from "next/link";
import { H2, StaticPage } from "@/components/StaticPage";
import { site } from "@/config/site";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const c = site.contact;
  const rows: [string, React.ReactNode][] = [
    ["Email", c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : null],
    ["Phone", c.phone ? <a href={`tel:${c.phone}`}>{c.phone}</a> : null],
    // A phone/email alternative is always listed alongside WhatsApp (blueprint 17).
    ["WhatsApp", c.whatsapp ? <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}>{c.whatsapp}</a> : null],
    ["Office", c.address || null],
    ["Hours", c.hours || null],
  ];
  const shown = rows.filter(([, v]) => v);
  return (
    <StaticPage title="Contact us" intro="Questions about membership, listing your business, or something on the site.">
      {shown.length ? (
        <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 p-6">
          {shown.map(([k, v]) => <Fragment key={k}><dt className="font-bold text-ink">{k}</dt><dd>{v}</dd></Fragment>)}
        </dl>
      ) : (
        <p className="card p-6 text-sm text-ink-muted">Contact details will be published here shortly.</p>
      )}
      <H2>Other ways to reach the right team</H2>
      <ul className="list-disc pl-5">
        <li>Found something wrong on a page? <Link href="/corrections">Report a correction</Link> from that page.</li>
        <li>Want your business listed? <Link href="/join">List your business</Link>.</li>
        <li>Questions about plans and payments? See <Link href="/membership">membership</Link>.</li>
      </ul>
    </StaticPage>
  );
}
