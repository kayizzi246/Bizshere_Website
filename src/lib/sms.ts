/**
 * Text messages (sign-in codes), sent through EgoSMS (Pahappa):
 * https://developers.pahappa.com/docs/sending-sms/api-specs-and-usage/
 *
 * Needs EGOSMS_USERNAME and EGOSMS_PASSWORD in .env (Comms account → Settings → API Settings).
 * EGOSMS_SENDER_ID is optional and must be approved on the account first; EGOSMS_URL can point
 * at the sandbox for testing. Without the keys sendSms returns false and only the test number
 * can sign in (see src/lib/phone-codes.ts). `npm run sms:test -- 0772123456` sends a test text.
 */
const LIVE_URL = "https://comms.egosms.co/api/v1/json/";

type EgoResponse = { Status?: string; Message?: string; Cost?: number; MsgFollowUpUniqueCode?: string };

/** Sends `text` to `to` (+256772123456, 0772 123 456 …). True when EgoSMS accepted it. */
export async function sendSms(to: string, text: string): Promise<boolean> {
  const username = process.env.EGOSMS_USERNAME;
  const password = process.env.EGOSMS_PASSWORD;
  if (!username || !password) {
    console.error("sms: EGOSMS_USERNAME / EGOSMS_PASSWORD are not set");
    return false;
  }
  // EgoSMS wants the international number without "+" or "00": 256772123456
  let number = to.replace(/\D/g, "").replace(/^00/, "");
  if (number.startsWith("0")) number = `256${number.slice(1)}`;

  const message: Record<string, unknown> = { number, message: text, priority: 0 }; // 0: most urgent (codes expire)
  if (process.env.EGOSMS_SENDER_ID) message.senderid = process.env.EGOSMS_SENDER_ID;

  try {
    const res = await fetch(process.env.EGOSMS_URL || LIVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "SendSms", userdata: { username, password }, msgdata: [message] }),
      signal: AbortSignal.timeout(15_000),
    });
    // Failures also come back as HTTP 200, so the Status field decides.
    const body = (await res.json().catch(() => ({}))) as EgoResponse;
    if (res.ok && body.Status === "OK") return true;
    console.error(`sms: EgoSMS refused the message to ${number}: HTTP ${res.status} ${body.Status ?? ""} ${body.Message ?? ""}`.trim());
    return false;
  } catch (e) {
    console.error(`sms: EgoSMS could not be reached: ${(e as Error).message}`);
    return false;
  }
}
