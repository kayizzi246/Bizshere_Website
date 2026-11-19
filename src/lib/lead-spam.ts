/**
 * Scores a contact-form message for spam, so the team is never texted about one.
 *
 * The honeypot in src/app/actions/leads.ts catches robots that fill every box on a page.
 * It does not catch the ones written for contact forms, which fill the visible boxes properly
 * and leave the hidden one alone. Those get through, are saved as leads, and — the part that
 * costs money — text the team's phone, every time.
 *
 * So this reads the message the way a person would: someone selling search-engine listings,
 * linking to their own site, writing from an address at that same site and leaving a phone
 * number that was never going to be answered. A real enquiry, even one that mentions a
 * website, does not look like that.
 *
 * Nothing is thrown away. A message scoring at or above SPAM_SCORE is kept with status SPAM
 * for Admin → Leads → Spam, and the team is simply not woken up for it.
 */

/** At this score or above, a message is treated as spam. */
export const SPAM_SCORE = 4;

// What people selling things write. Deliberately narrow: words a Ugandan business would use
// about its own trade ("we supply", "price", "quote") are not here.
const PITCH = [
  /\bsearch\s+(engine|index|results?)\b/i,
  /\b(seo|backlinks?|serps?|domain\s+authority)\b/i,
  /\brank(ing)?\s+(higher|on|your|#?1)\b/i,
  /\bindex(ing|register)?\s+(your|this)\s+(site|website|domain)\b/i,
  /\b(web|website)\s+(design|development|redesign)\s+(services?|offers?|company)\b/i,
  /\b(crypto|bitcoin|forex|casino|viagra|loan\s+offers?)\b/i,
  /\b(guest\s+post|link\s+building|traffic\s+to\s+your)\b/i,
  /\bunsubscribe\b/i,
];

/** Web addresses in the text, with or without https:// in front. */
const LINKS = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9][a-z0-9-]{1,}\.(?:com|net|org|pro|site|online|xyz|info|biz|top|club|shop|live|store|icu|cfd|sbs)\b/gi;

/** A number someone in Uganda could actually be called on. */
const plausiblePhone = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  if (/^(0|256|00256)/.test(d)) return d.length >= 9 && d.length <= 15; // Uganda, however it is written
  return d.length >= 10 && d.length <= 15; // somewhere else, but still a whole number
};

export type SpamVerdict = { score: number; spam: boolean; reasons: string[] };

export function scoreLead(input: { name: string; phone: string; email: string; message: string }): SpamVerdict {
  const message = input.message ?? "";
  const reasons: string[] = [];
  let score = 0;

  const links = [...new Set((message.match(LINKS) ?? []).map((l) => l.toLowerCase()))];
  if (links.length >= 2) {
    score += 3;
    reasons.push(`${links.length} web addresses in the message`);
  } else if (links.length === 1) {
    // One link can be a real supplier showing their catalogue, so on its own it is not enough.
    score += 2;
    reasons.push("a web address in the message");
  }

  const pitched = PITCH.filter((p) => p.test(message));
  if (pitched.length) {
    score += 2;
    reasons.push("selling search listings or similar");
  }

  // Writing from an address at the very site being advertised.
  const domain = (input.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  const root = domain.split(".").slice(-2).join(".");
  if (root && links.some((l) => l.includes(root))) {
    score += 2;
    reasons.push("writes from the same site it links to");
  }

  if (!plausiblePhone(input.phone ?? "")) {
    score += 1;
    reasons.push("the phone number could not be called");
  }

  // A wall of text with no question in it is a circular, not an enquiry.
  if (message.length > 700 && !message.includes("?")) {
    score += 1;
    reasons.push("long, and asks nothing");
  }

  return { score, spam: score >= SPAM_SCORE, reasons };
}
