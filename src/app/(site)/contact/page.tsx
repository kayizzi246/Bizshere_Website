import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { LeadForm } from "@/components/LeadForm";
import type { LeadInterest } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact us", description: "Talk to the BizSphere-Ug team: WhatsApp, call, or leave your number and we call you back about membership or listing your business." };

/**
 * Contact: the fastest ways first (WhatsApp, a call), then "leave your number" for anyone who
 * would rather be called. ?about=supplier_listing (etc.) preselects what they want.
 */
export default async function ContactPage({ searchParams }: { searchParams: { about?: string } }) {
  const [c, viewer] = await Promise.all([getContact(), getViewer()]);
  const me = viewer.userId ? await prisma.user.findUnique({ where: { id: viewer.userId }, select: { name: true, phone: true, email: true } }) : null;
  const about = (["membership", "supplier_listing", "expert_listing", "question"] as LeadInterest[]).find((k) => k === searchParams.about) ?? "membership";
  const wa = c.whatsapp ? whatsappHref(c.whatsapp, "Hello BizSphere-Ug, I'd like to know more.") : null;
  const ways = [
    wa && { Glyph: MessageCircle, label: "WhatsApp us", value: c.whatsapp, href: wa, tone: "bg-[#25D366] text-white hover:bg-[#1DA851] hover:text-white", external: true },
    c.phone && { Glyph: Phone, label: "Call us", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}`, tone: "bg-brand text-white hover:bg-brand-dark hover:text-white" },
    c.email && { Glyph: Mail, label: "Email us", value: c.email, href: `mailto:${c.email}`, tone: "bg-accent text-ink hover:bg-accent-dark hover:text-white" },
  ].filter(Boolean) as { Glyph: typeof Phone; label: string; value: string; href: string; tone: string; external?: boolean }[];

  return (
    <div className="under-header-pad bg-page">
      <div className="container-site flex flex-col gap-8 py-10 sm:py-14">
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="text-page-title text-heading">Talk to us</h1>
          <p className="text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">Questions about membership, listing your business as a supplier or expert, or something you saw on the site. A person answers, in English or Luganda.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-10">
          <div className="flex flex-col gap-4">
            {ways.length ? (
              <div className="flex flex-col gap-2">
                {ways.map((w) => (
                  <a key={w.label} href={w.href} {...(w.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`flex min-h-[60px] items-center gap-3 rounded-2xl px-5 py-3 font-display transition-colors ${w.tone}`}>
                    <w.Glyph aria-hidden className="h-5 w-5 shrink-0" />
                    <span className="flex min-w-0 flex-col leading-tight"><span className="text-[16px] font-extrabold">{w.label}</span><span className="break-all text-[13px] font-semibold opacity-90">{w.value}</span></span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-line bg-white p-5 text-sm text-ink-muted">Leave your number in the form and we&apos;ll call you back.</p>
            )}
            {c.address || c.hours ? (
              <dl className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 text-sm">
                {c.address ? <div className="flex items-start gap-2.5"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span><dt className="font-bold text-heading">Office</dt><dd className="text-ink-soft">{c.address}</dd></span></div> : null}
                {c.hours ? <div className="flex items-start gap-2.5"><Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><span><dt className="font-bold text-heading">Hours</dt><dd className="text-ink-soft">{c.hours}</dd></span></div> : null}
              </dl>
            ) : null}
            <ul className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 text-[14px] text-ink-soft">
              <li>Want to be listed? <Link href="/suppliers/join">Become a supplier</Link> or <Link href="/experts/join">become an expert</Link>: register and pay in five minutes, our team checks the listing.</li>
              <li>Plans and prices: see <Link href="/membership">membership</Link>. Pay with MTN MoMo, Airtel Money or a card.</li>
              <li>Found something wrong on a page? <Link href="/corrections">Report a correction</Link>.</li>
            </ul>
          </div>

          <LeadForm defaults={me ?? undefined} interest={about} whatsapp={wa} />
        </div>
      </div>
    </div>
  );
}
