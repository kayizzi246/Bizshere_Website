import { settlePayment } from "@/lib/membership";
import { ReturnNotice } from "./ReturnNotice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment", robots: { index: false } };

/**
 * Pesapal's callback_url. It opens inside the pop-up's iframe once the person has paid (or given
 * up), with ?OrderTrackingId=…&OrderMerchantReference=…. The order is checked with Pesapal here;
 * the page then tells the pop-up, which closes itself and shows the welcome screen.
 * Outside the (site) layout, so no header or footer appears inside the iframe.
 */
export default async function PaymentReturn({ searchParams }: { searchParams: { OrderTrackingId?: string } }) {
  const trackingId = searchParams.OrderTrackingId;
  const status = trackingId ? await settlePayment({ trackingId }).catch(() => "PENDING" as const) : "FAILED";
  return <ReturnNotice status={status} />;
}
