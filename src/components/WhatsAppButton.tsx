import { MessageCircle } from "lucide-react";
import { getContact, whatsappHref } from "@/lib/site-contact";

/**
 * The green WhatsApp chat button in the corner of every page, when the team has set a WhatsApp number
 * (Admin > Contact details). Bottom-left on phones (the services button has the right), bottom-right
 * on laptops (All services has the left). Opens a chat with a first message already written.
 */
export async function WhatsAppButton() {
  const c = await getContact().catch(() => null);
  if (!c?.whatsapp) return null;
  return (
    <a href={whatsappHref(c.whatsapp, "Hello BizSphere-Ug, I'd like to know more.")} target="_blank" rel="noopener noreferrer" data-chrome=""
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-5 left-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#25D366] pl-4 pr-5 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(37,211,102,0.45)] transition hover:bg-[#1DA851] hover:text-white motion-safe:hover:-translate-y-0.5 lg:left-auto lg:right-5">
      <MessageCircle aria-hidden className="h-6 w-6" />
      <span className="hidden sm:inline">WhatsApp us</span>
      <span className="sm:hidden">Chat</span>
    </a>
  );
}
