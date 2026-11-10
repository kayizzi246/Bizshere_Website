/** What someone can ask for on the contact form (src/components/LeadForm.tsx), in the form's order. */
export const LEAD_INTERESTS = [
  ["membership", "Membership: full access to prices, contacts and plans"],
  ["supplier_listing", "List my business as a supplier"],
  ["expert_listing", "List myself as a business expert"],
  ["question", "A question or something else"],
] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number][0];
export const LEAD_INTEREST_KEYS = LEAD_INTERESTS.map(([k]) => k) as [LeadInterest, ...LeadInterest[]];
export const interestLabel = (v: string) => LEAD_INTERESTS.find(([k]) => k === v)?.[1] ?? v;
/** The short form, for SMS and badges: "Membership", "List my business as a supplier". */
export const interestShort = (v: string) => interestLabel(v).split(":")[0];
