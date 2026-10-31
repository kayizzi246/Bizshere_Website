/**
 * Sends one test text through EgoSMS with the settings in .env, to check the connection.
 *
 *   npm run sms:test -- 0772123456
 */
import { sendSms } from "../src/lib/sms";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npm run sms:test -- <phone number>");
  process.exit(1);
}

sendSms(to, "BizSphere-Ug test message: SMS is working.").then((ok) => {
  console.log(ok ? `Sent to ${to}. Check the phone.` : "Not sent. See the error above.");
  process.exit(ok ? 0 : 1);
});
