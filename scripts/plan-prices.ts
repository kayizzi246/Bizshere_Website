/**
 * Sets the member plan's prices, for testing payments end to end (Pesapal sandbox or live).
 * The real prices are set later at /admin/plans.
 *
 *   npm run plans:test-prices                       UGX 500 a day, 1,000 a month, 10,000 a year
 *   npm run plans:test-prices -- 1000 20000 200000  daily, monthly, yearly
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [daily = 500, monthly = 1000, yearly = 10000] = process.argv.slice(2).map(Number);

async function main() {
  if (![daily, monthly, yearly].every((n) => Number.isFinite(n) && n > 0)) throw new Error("Prices must be positive numbers: daily monthly yearly");
  const plan = await prisma.membershipPlan.update({
    where: { code: "member" },
    data: { priceDaily: daily, priceMonthly: monthly, priceYearly: yearly },
  });
  console.log(`${plan.name}: UGX ${daily} a day, ${monthly} a month, ${yearly} a year. Pages show it within 5 minutes (or after any admin save).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
