import { MessageCircle, Phone } from "lucide-react";
import { phoneNumbers } from "@/lib/expert-names";
import { whatsappHref } from "@/lib/whatsapp";

/**
 * Call and WhatsApp along the bottom of the screen on phones and tablets, on every page that shows
 * someone's contact details (client, 25 Nov 2026): the expert and supplier pages, a supplier's product,
 * directory records with a phone, and Contact us. WhatsApp shows only when there is a WhatsApp number;
 * otherwise it is Call alone, full width. Nothing shows without a phone or WhatsApp number, and pages
 * must not render it for visitors who may not see the numbers.
 *
 * data-sticky-bar lifts the floating buttons above it and pads the page so the footer is not covered
 * (globals.css); data-own-whatsapp hides the site's "Talk to us" button when this bar already is ours.
 */
export function StickyContact({ phone, whatsapp, message = "Hello, I found you on BizSphere-Ug.", ours }: {
  phone?: string | null;
  /** The WhatsApp number; leave empty for Call only. */
  whatsapp?: string | null;
  /** The first message written into the WhatsApp chat. */
  message?: string;
  /** The site's own numbers (Contact us), so the floating WhatsApp button is not shown twice. */
  ours?: boolean;
}) {
  const call = phone?.trim() ? (phoneNumbers(phone)[0] ?? phone.trim()) : null;
  const wa = whatsapp?.trim() || null;
  if (!call && !wa) return null;
  const btn = "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-5 font-display text-[15px] font-bold text-white hover:text-white";
  return (
    <div data-sticky-bar="" {...(ours ? { "data-own-whatsapp": "" } : {})}
      className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      {call ? <a href={`tel:${call.replace(/[^+0-9]/g, "")}`} className={`${btn} bg-brand hover:bg-brand-dark`}><Phone aria-hidden className="h-4 w-4" />Call</a> : null}
      {wa ? <a href={whatsappHref(wa, message)} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25D366] hover:bg-[#1DA851]`}><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp</a> : null}
    </div>
  );
}
