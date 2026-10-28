import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { customerOf, listPayments, METHOD_LABEL, STATUS_LABEL } from "@/lib/admin-payments";

export const dynamic = "force-dynamic";

/** CSV of the payments shown on /admin/payments (same filters), staff only. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) return new NextResponse("Not found", { status: 404 });

  const sp = req.nextUrl.searchParams;
  const rows = await listPayments({ status: sp.get("status") ?? undefined, method: sp.get("method") ?? undefined, q: sp.get("q") ?? undefined }, 10_000);
  // Quote every cell; a leading = + - @ is prefixed so spreadsheets don't run it as a formula.
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = [
    ["Date", "Customer", "Email or phone", "Plan", "Period", "Method", "Amount", "Currency", "Status", "Reference"].map(cell).join(","),
    ...rows.map((p) => {
      const c = customerOf(p);
      return [(p.paidAt ?? p.createdAt).toISOString().slice(0, 10), c.name, c.contact, p.subscription.plan.name, p.subscription.period, METHOD_LABEL[p.method], String(p.amount), p.currency, STATUS_LABEL[p.status], p.providerRef ?? ""].map(cell).join(",");
    }),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bizsphere-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
