import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { site } from "@/config/site";

/**
 * The frame around every staff, supplier and expert sign-in form: a large two-panel card.
 * Left, deep brand blue: a welcome, what the portal is for, and how to reach the team. Right,
 * white with a curved inner corner: the logo, then the form (`children`). On phones the panels
 * stack and the blue one keeps only its heading.
 *
 * Contact details come from src/config/site.ts and are shown only once set; until then a link
 * to the contact page stands in.
 */
export function AuthShell({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  const { phone, email, address } = site.contact;
  const contacts = [
    phone ? { icon: Phone, label: phone, href: `tel:${phone.replace(/\s/g, "")}` } : null,
    email ? { icon: Mail, label: email, href: `mailto:${email}` } : null,
    address ? { icon: MapPin, label: address, href: null } : null,
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string | null }[];

  return (
    <div className="flex justify-center px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-[920px] overflow-hidden rounded-[28px] bg-brand-deep md:grid-cols-[1fr_1.05fr]">
        {/* Welcome */}
        <div className="relative isolate overflow-hidden px-6 py-7 text-white sm:px-10 md:py-12">
          <div aria-hidden className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-white/[0.06]" />
          <div aria-hidden className="absolute -bottom-20 -left-12 -z-10 h-64 w-64 rounded-full bg-brand/40 blur-2xl" />
          <h1 className="text-center font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-center text-[14px] leading-relaxed text-white/80 md:text-[15px]">{text}</p>

          <div className="mt-8 hidden flex-col items-center gap-4 md:flex">
            <p className="font-display text-[16px] font-extrabold">Need help?</p>
            {contacts.length ? (
              <ul className="flex flex-col gap-2.5 text-[14px] text-white/85">
                {contacts.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    <c.icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {c.href ? <a href={c.href} className="text-white/85 hover:text-white">{c.label}</a> : <span>{c.label}</span>}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 hover:text-white">
              <MessageSquare aria-hidden className="h-4 w-4" />Send us a message
            </Link>
            {/* Uganda flag stripes */}
            <span aria-hidden className="mt-2 flex h-2 w-24 overflow-hidden rounded-full">
              <span className="flex-1 bg-black" /><span className="flex-1 bg-[#FCDC04]" /><span className="flex-1 bg-[#D90000]" />
              <span className="flex-1 bg-black" /><span className="flex-1 bg-[#FCDC04]" /><span className="flex-1 bg-[#D90000]" />
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center rounded-t-[28px] bg-surface px-6 py-8 sm:px-10 md:rounded-l-none md:rounded-r-[28px] md:rounded-bl-[72px] md:py-12">
          <Link href="/" aria-label="BizSphere-Ug home" className="mx-auto mb-6 block">
            <Image src="/brand/logo-full.png" alt="BizSphere-Ug" width={1018} height={696} data-nofit="" className="h-16 w-auto" priority />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
