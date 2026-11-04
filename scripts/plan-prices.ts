/**
 * Sets the member plan's prices, for testing payments end to end (Pesapal sandbox or live).
 * The real prices are set later at /admin/plans.
 *
 *   npm run plans:test-prices                              UGX 500 a day, 2,000 a week, 5,000 a month, 50,000 a year
 *   npm run plans:test-prices -- 1000 5000 15000 150000    daily, weekly, monthly, yearly
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [daily = 500, weekly = 2000, monthly = 5000, yearly = 50000] = process.argv.slice(2).map(Number);

async function main() {
  if (![daily, weekly, monthly, yearly].every((n) => Number.isFinite(n) && n > 0)) throw new Error("Prices must be positive numbers: daily weekly monthly yearly");
  const plan = await prisma.membershipPlan.update({
    where: { code: "member" },
    data: { priceDaily: daily, priceWeekly: weekly, priceMonthly: monthly, priceYearly: yearly },
  });
  console.log(`${plan.name}: UGX ${daily} a day, ${weekly} a week, ${monthly} a month, ${yearly} a year. Pages show it within 5 minutes (or after any admin save).`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
