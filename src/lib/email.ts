/**
 * Email (membership receipts and renewal reminders), sent through Resend's HTTP API:
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend) in .env.
 * Without them sendEmail returns false. Locally, SMS_CONSOLE=true also prints emails in the
 * terminal running `npm run dev` instead of sending them (see src/lib/sms.ts).
 */
import { smsToConsole } from "./sms";

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (smsToConsole()) {
    console.log(`\n┌─ Email (not sent: SMS_CONSOLE=true) ───────\n│ To:      ${to}\n│ Subject: ${subject}\n│ ${text.replace(/\n/g, "\n│ ")}\n└────────────────────────────────────────────\n`);
    return true;
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("email: RESEND_API_KEY / EMAIL_FROM are not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return true;
    console.error(`email: Resend refused the message to ${to}: HTTP ${res.status} ${await res.text().catch(() => "")}`.trim());
    return false;
  } catch (e) {
    console.error(`email: Resend could not be reached: ${(e as Error).message}`);
    return false;
  }
}
