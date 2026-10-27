/**
 * Text messages (sign-in codes).
 *
 * Not connected yet. Choose a provider that delivers to Ugandan networks (for
 * example Africa's Talking), put its keys in .env (SMS_*), then implement sendSms.
 * Until then it returns false and only the test number can sign in (see
 * src/lib/phone-codes.ts).
 */
export async function sendSms(_to: string, _text: string): Promise<boolean> {
  return false;
}
