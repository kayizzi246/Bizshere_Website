/**
 * WhatsApp links. Plain functions with no server imports, so browser components (the payment
 * pop-up, the share button) can use them: src/lib/site-contact.ts, which reads the database, must
 * never be imported from a "use client" file.
 */

/** A phone number as WhatsApp wants it: digits with the country code. Local numbers are Ugandan. */
export const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
};

/** A wa.me link that opens a chat with the number, with the first message written in. */
export const whatsappHref = (phone: string, text: string) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
