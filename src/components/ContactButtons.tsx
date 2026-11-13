import Link from "next/link";
import { LockKeyhole, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";

/** A phone number as WhatsApp wants it: digits with the country code. Local numbers are Ugandan. */
const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
};

/**
 * Call, WhatsApp and email, as three big buttons on an expert's or supplier's page. For a visitor
 * (`gated`) the same buttons show with a lock and open the sign-up pop-up: only whether a number or
 * address exists reaches the page, never the number or address itself.
 */
export function ContactButtons({ phone, email, gated, back, me = "me" }: { phone?: string | null; email?: string | null; gated: boolean; back: string; me?: "me" | "us" }) {
  const hello = encodeURIComponent("Hello, I found you on BizSphere-Ug.");
  const buttons: { label: string; Glyph: LucideIcon; tone: string; href: string; shows?: string | null; external?: boolean }[] = [
    ...(phone ? [{ label: `Call ${me}`, Glyph: Phone, tone: "bg-brand text-white hover:bg-brand-dark hover:text-white", href: `tel:${phone.replace(/\s/g, "")}`, shows: phone }] : []),
    ...(phone ? [{ label: `WhatsApp ${me}`, Glyph: MessageCircle, tone: "bg-[#1F7A4D] text-white hover:bg-[#17603C] hover:text-white", href: `https://wa.me/${whatsappNumber(phone)}?text=${hello}`, external: true }] : []),
    ...(email ? [{ label: `Email ${me}`, Glyph: Mail, tone: "bg-accent text-ink hover:bg-accent-dark hover:text-white", href: `mailto:${email}?subject=${hello}`, shows: email }] : []),
  ];
  if (!buttons.length) return <p className="text-[14px] text-ink-muted">No phone or email listed yet.</p>;

  const button = "flex min-h-[46px] items-center gap-2.5 rounded-xl px-3.5 py-1.5 font-display transition-colors";
  return (
    <div className="flex flex-col gap-2">
      {buttons.map(({ label, Glyph, tone, href, shows, external }) => (gated ? (
        <Link key={label} href={back} data-onboard="" className={`${button} ${tone}`}>
          <Glyph aria-hidden className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-[14px] font-bold">{label}</span>
          <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />
        </Link>
      ) : (
        <a key={label} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`${button} ${tone}`}>
          <Glyph aria-hidden className="h-4 w-4 shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[14px] font-bold">{label}</span>
            {shows ? <span className="break-all text-[12px] font-medium">{shows}</span> : null}
          </span>
        </a>
      )))}
      {gated ? <p className="text-center text-[13px] text-ink-muted">Contacts are open to members.</p> : null}
    </div>
  );
}
