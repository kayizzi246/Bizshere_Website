import { MessageCircle } from "lucide-react";
import { requireArea } from "@/lib/access";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { saveContactSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact details" };

/**
 * The site's own contact details. They show in the footer, on /contact, in the payment pop-up when a
 * payment fails, and the WhatsApp number becomes the green chat button on every page.
 */
export default async function AdminSettingsPage({ searchParams }: { searchParams: { error?: string; saved?: string } }) {
  await requireArea("homepage");
  const c = await getContact();
  const field = (name: keyof typeof c, label: string, help: string, placeholder: string, type = "text") => (
    <label className="label">{label}
      <input name={name} type={type} defaultValue={c[name]} placeholder={placeholder} className="input" />
      <span className="text-xs font-normal text-ink-muted">{help}</span>
    </label>
  );

  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">Contact details</h1>
        <p className="text-sm text-ink-muted">How people reach you. These show in the footer, on the Contact page and in the payment pop-up. The WhatsApp number becomes the green chat button on every page of the site.</p>
      </div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {searchParams.saved ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">Saved. The site is updated.</p> : null}

      <form action={saveContactSettings} className="card flex flex-col gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("whatsapp", "WhatsApp number", "The green button on every page opens a chat with this number. Most leads will come this way.", "e.g. 0772 123 456", "tel")}
          {field("phone", "Phone number", "For calls. Can be the same as WhatsApp.", "e.g. 0772 123 456", "tel")}
          {field("email", "Email address", "Leads from the Contact page are also sent here (when email sending is set up).", "e.g. hello@bizsphere.ug", "email")}
          {field("hours", "Opening hours", "When someone can expect an answer.", "e.g. Mon–Sat, 8am–6pm")}
        </div>
        {field("address", "Office address", "Shown on the Contact page and in the footer.", "e.g. Plot 12, Kampala Road, Kampala")}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <button className="btn-primary min-h-[44px] px-5">Save</button>
          {c.whatsapp ? (
            <a href={whatsappHref(c.whatsapp, "Hello BizSphere-Ug")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white hover:bg-[#1DA851] hover:text-white">
              <MessageCircle aria-hidden className="h-4 w-4" />Test the WhatsApp button
            </a>
          ) : <span className="text-[13px] text-ink-muted">No WhatsApp number yet: the chat button is hidden until you add one.</span>}
        </div>
      </form>
    </>
  );
}
