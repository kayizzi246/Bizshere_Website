import Link from "next/link";

export const metadata = { title: "Checkout" };

// Placeholder until a payment gateway is connected (see src/lib/payments.ts).
export default function CheckoutPage({ searchParams }: { searchParams: { plan?: string; period?: string } }) {
  return (
    <div className="container-site flex max-w-xl flex-col gap-4 py-16">
      <h1 className="text-2xl font-extrabold">Checkout</h1>
      <p className="text-ink-soft">Plan: <strong>{searchParams.plan ?? "member"}</strong>, billed {searchParams.period ?? "monthly"}.</p>
      <div className="card p-6 text-sm text-ink-muted">
        Payments are not connected yet. Developers: implement <code>startCheckout()</code> in <code>src/lib/payments.ts</code> for MTN MoMo, Airtel Money and cards, and grant access from the payment webhook.
      </div>
      <Link href="/membership" className="btn-outline self-start">Back to plans</Link>
    </div>
  );
}
