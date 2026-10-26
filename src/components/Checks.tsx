import type { VerificationCheck } from "@prisma/client";
import { checkLabel, date } from "@/lib/format";

/** Shows only checks that passed, each with its own date (never a blanket "verified"). */
export function CheckBadges({ checks }: { checks: Pick<VerificationCheck, "id" | "checkType" | "result" | "checkedAt">[] }) {
  const passed = checks.filter((c) => c.result === "PASSED");
  if (passed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {passed.map((c) => (
        <span key={c.id} className="badge-ok">✓ {checkLabel[c.checkType]} checked {date(c.checkedAt)}</span>
      ))}
    </div>
  );
}
