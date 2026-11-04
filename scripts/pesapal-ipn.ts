/**
 * Registers this site's payment notification address (IPN) with Pesapal and prints its id, for
 * PESAPAL_IPN_ID. Uses the Pesapal keys and PESAPAL_ENV in .env, so the id belongs to that account
 * and server (sandbox or live). Run it again after changing either: ids don't carry across.
 *
 *   npm run pesapal:ipn                                         address from NEXTAUTH_URL
 *   npm run pesapal:ipn -- https://bizsphere.ug/api/payments/webhook
 */
import { pesapalConfigured, registerIpn } from "../src/lib/payments";
import { site } from "../src/config/site";

async function main() {
  if (!pesapalConfigured()) throw new Error("Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in .env first.");
  const url = process.argv[2] ?? `${site.url}/api/payments/webhook`;
  if (!/^https:\/\//.test(url)) {
    console.warn(`Warning: ${url} is not a public https address, so Pesapal can't reach it. Payments still work (the pop-up checks them itself),\nbut for the live site pass the real address: npm run pesapal:ipn -- https://<your domain>/api/payments/webhook\n`);
  }
  const r = await registerIpn(url);
  console.log(`${r.existing ? "Already registered" : "Registered"} on Pesapal ${process.env.PESAPAL_ENV === "sandbox" ? "sandbox" : "live"}: ${r.url}\n\nPut this in .env (and in the host's environment variables):\n\nPESAPAL_IPN_ID="${r.ipnId}"`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
