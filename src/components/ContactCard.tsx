import type { Contact } from "@prisma/client";
import type { Viewer } from "@/lib/access";
import { Gate } from "./Gate";

/**
 * Contact details. Callers must only pass `contacts` for members; for visitors
 * the query should not load them at all (see src/lib/access.ts).
 * Wherever WhatsApp appears, a phone or email alternative is shown too (blueprint 17).
 */
export function ContactCard({ viewer, contacts, name }: { viewer: Viewer; contacts: Contact[]; name: string }) {
  return (
    <section className="card flex flex-col gap-3 p-6">
      <h2 className="text-lg font-bold">Contact {name}</h2>
      {!viewer.isMember ? (
        <Gate title="Subscribe to see contact details" text="Phone, email and WhatsApp are available to members." button="Show contact" modalTitle="Subscribe to see contact details" />
      ) : contacts.length === 0 ? (
        <span className="text-sm text-ink-muted">No contact on file.</span>
      ) : contacts.map((c) => (
        <div key={c.id} className="flex flex-col gap-1.5 text-sm">
          {c.personName ? <span className="font-bold">{c.personName}{c.personRole ? <span className="font-normal text-ink-muted">, {c.personRole}</span> : null}</span> : null}
          {c.phone ? <a href={`tel:${c.phone}`} className="btn-outline justify-start">Call {c.phone}</a> : null}
          {c.whatsapp ? <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="btn-outline justify-start">WhatsApp</a> : null}
          {c.email ? <a href={`mailto:${c.email}`} className="btn-outline justify-start">Email {c.email}</a> : null}
          {c.website ? <a href={c.website} target="_blank" rel="noreferrer">Website ↗</a> : null}
          {c.preferredMethod ? <span className="text-ink-muted">Prefers: {c.preferredMethod}</span> : null}
        </div>
      ))}
    </section>
  );
}
