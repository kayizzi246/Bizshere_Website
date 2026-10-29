import type { VerificationCheck } from "@prisma/client";
import { checkLabel, date } from "@/lib/format";

/** Shows only checks that passed, each with its own date (never a blanket "verified"). */
export function CheckBadges({ checks }: { checks: Pick<VerificationCheck, "id" | "checkType" | "result" | "checkedAt">[] }) {
  // The latest passed check of each kind: a re-check replaces the older badge instead of repeating it.
  const latest = new Map<string, (typeof checks)[number]>();
  for (const c of checks) {
    if (c.result !== "PASSED") continue;
    const prev = latest.get(c.checkType);
    if (!prev || new Date(c.checkedAt) > new Date(prev.checkedAt)) latest.set(c.checkType, c);
  }
  const passed = [...latest.values()];
  if (passed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {passed.map((c) => (
        <span key={c.id} className="badge-ok">✓ {checkLabel[c.checkType]} checked {date(c.checkedAt)}</span>
      ))}
    </div>
  );
}
