/**
 * Sends one test text through EgoSMS with the settings in .env, to check the connection.
 *
 *   npm run sms:test -- 0772123456
 */
import { sendSms, smsToConsole } from "../src/lib/sms";

const to = process.argv[2];
if (!to) {
  console.error("Usage: npm run sms:test -- <phone number>");
  process.exit(1);
}

sendSms(to, "BizSphere-Ug test message: SMS is working.").then((ok) => {
  console.log(!ok ? "Not sent. See the error above." : smsToConsole() ? "Printed above, not sent (SMS_CONSOLE=true). Set it to \"\" in .env to send for real." : `Sent to ${to}. Check the phone.`);
  process.exit(ok ? 0 : 1);
});
