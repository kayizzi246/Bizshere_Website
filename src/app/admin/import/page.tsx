import { redirect } from "next/navigation";
import { staffAccess } from "@/lib/access";
import { contentArea } from "@/lib/admin-areas";
import { IMPORT_KINDS, type ImportKind } from "@/lib/bulk-import";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import from a spreadsheet" };

/**
 * Adding many business ideas, suppliers or experts at once from an Excel or CSV file, instead of
 * typing them one page at a time.
 *
 * Only the directories this member of staff may edit are offered; someone who can edit suppliers
 * but not business ideas sees only Suppliers. The action checks the same thing again, because a
 * screen that hides a button is not a permission check.
 */
export default async function ImportPage() {
  const staff = await staffAccess();
  const allowed = (Object.keys(IMPORT_KINDS) as ImportKind[]).filter((k) => staff.can(contentArea(k)));
  if (!allowed.length) redirect("/admin?denied=import");

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[19px] font-extrabold tracking-tight text-heading">Import from a spreadsheet</h1>
        <p className="text-[13px] text-ink-soft">
          Add many at once from Excel (.xlsx) or CSV. Everything arrives as a draft, so nothing reaches the public
          site until you publish it.
        </p>
      </header>
      <ImportClient allowed={allowed} />
    </div>
  );
}
