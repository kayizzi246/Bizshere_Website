import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getIdea, plansOf } from "@/lib/ideas";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { budgetTotal } from "@/lib/costing";
import { compactRange, date, money, moneyRange } from "@/lib/format";
import { PLAN_LABEL, PLAN_ORDER, points, titleCase } from "@/components/IdeaParts";
import { IdeaPdf, type IdeaPdfData } from "@/lib/idea-pdf";
import { visibleGroups } from "@/components/FieldSections";
import { isMemberOnly, MONEY_FIELDS } from "@/lib/content-fields";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /business-ideas/[slug]/pdf: the idea's business plan as a designed PDF, shown inside the
 * idea page and downloadable (?download=1). It holds everything the page shows, for the plan size
 * picked on the page (?scenario=LOW|STANDARD|HIGHER, default the medium plan). Gated like the
 * page: visitors get the free preview (first budget lines and steps, no totals); members everything.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await getIdea(params.slug, viewer.isStaff);
  if (!item || !item.businessIdea) return new Response("Not found", { status: 404 });
  const idea = item.businessIdea;
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const name = item.title.replace(/^Sample:\s*/i, "");
  const origin = new URL(req.url).origin;

  // The plan size chosen on the page, as the page picks it.
  const scenarios = plansOf(idea);
  const wanted = PLAN_ORDER.find((l) => l === new URL(req.url).searchParams.get("scenario"));
  const main = scenarios.find((s) => s.level === wanted) ?? scenarios.find((s) => s.level === "STANDARD") ?? scenarios[0];
  const shownPlans = main ? [main] : [];

  const keyPoints = points(idea.keyRequirements);
  const allLines = main?.lines ?? [];
  const previewLines = gated ? allLines.slice(0, FREE_PREVIEW.budgetLines) : allLines;
  const requirements = [
    ...keyPoints.map((p) => ({ name: p, group: "Key requirement", key: true })),
    ...previewLines.map((l) => ({ name: l.description, group: l.costCategory || "Other", key: false })),
  ];
  const steps = gated ? idea.steps.slice(0, FREE_PREVIEW.steps) : idea.steps;
  const locations = points(idea.locationRequirements);
  const skills = points(idea.requiredSkills);
  const special = points(idea.licencesToInvestigate);
  const capital = compactRange(idea.capitalMin, idea.capitalMax, idea.currency);
  const capitalFull = idea.capitalMin != null || idea.capitalMax != null ? moneyRange(idea.capitalMin, idea.capitalMax, idea.currency).replace("–", " – ") : null;

  const facts = ([
    ["Starting capital", capital],
    ["Requirements", keyPoints.length + allLines.length ? `${keyPoints.length + allLines.length} items` : null],
    ["Time to set up", idea.setupTime],
    ["Profit potential", titleCase(idea.profitPotential)],
    ["Skill level", titleCase(idea.experienceLevel)],
    ["Business size", titleCase(idea.businessSize)],
    ["Best locations", locations.join(", ") || null],
  ] as [string, string | null][]).filter((f): f is [string, string] => Boolean(f[1]));

  // The page's business profile, row for row, then every other filled field (as on the page).
  const profile = ([
    ["Business idea", name, null],
    ["Business size", titleCase(idea.businessSize), null],
    ["Business category", [item.primaryCategory?.name, idea.businessType].filter(Boolean).filter((v, n, a) => a.indexOf(v) === n).join(" · ") || null, null],
    ["Business description", item.shortSummary ?? item.overview, null],
    ["Key requirements", keyPoints.join(", ") || null, null],
    ["Best location", locations.join(", ") || null, idea.locationNotes],
    ["Starting capital", capitalFull, idea.capitalNotes],
    ["Special requirements", special.join(", ") || null, null],
    ["Target market", idea.targetCustomers, null],
    ["Success factors", idea.successFactors ? points(idea.successFactors).join(", ") : null, null],
    ["Profit potential", titleCase(idea.profitPotential), null],
    ["Key skills", skills.join(", ") || null, null],
    ["Time to set up", idea.setupTime, null],
    ["Start-up budget", main ? `${main.lines.length} items in the ${PLAN_LABEL[main.level].toLowerCase()} plan (below)` : null, null],
    ["Remarks", idea.remarks, null],
    ...extraFields(idea as unknown as Record<string, unknown>, gated),
  ] as [string, string | null, string | null][]).filter((r): r is [string, string, string | null] => Boolean(r[1]));

  const data: IdeaPdfData = {
    name,
    category: item.primaryCategory?.name ?? null,
    summary: item.shortSummary,
    overview: item.overview ?? item.shortSummary,
    logo: await loadImage("/brand/logo-full.png"),
    photo: idea.pictureUrl ? await loadImage(idea.pictureUrl) : null,
    photoCredit: idea.pictureCredit,
    url: `${origin}/business-ideas/${item.slug}`,
    reviewed: date(item.lastReviewedAt),
    facts,
    profile,
    requirements,
    requirementTotal: keyPoints.length + allLines.length,
    budgets: shownPlans.map((s) => {
      const lines = gated ? s.lines.slice(0, FREE_PREVIEW.budgetLines) : s.lines;
      const total = gated ? null : budgetTotal(s.lines);
      return {
        label: `${PLAN_LABEL[s.level]} plan`,
        place: `${s.location?.name ?? "Uganda"} · ${s.estimateDate ? `prices as of ${date(s.estimateDate)}` : "estimate date pending"}`,
        lines: lines.map((l) => ({
          item: `${l.description}${l.isOptional ? " (optional)" : ""}`,
          group: l.costCategory || "Other",
          qty: `${Number(l.quantity).toLocaleString("en-UG")}${l.unit ? ` ${l.unit}` : ""}`,
          price: l.unitCost === null ? "-" : money(l.unitCost, s.currency),
          amount: l.unitCost === null ? (l.unknownReason ?? "To be confirmed") : money(Number(l.unitCost) * Number(l.quantity), s.currency),
        })),
        hidden: s.lines.length - lines.length,
        total: gated ? null : total === null ? "Some costs pending" : money(total, s.currency),
        assumptions: s.assumptions,
      };
    }),
    steps: steps.map((st) => ({ n: st.stepNumber, title: st.title, text: st.description })),
    hiddenSteps: idea.steps.length - steps.length,
    member: !gated,
  };

  const pdf = await renderToBuffer(<IdeaPdf d={data} />);
  const file = `${item.slug}-business-plan.pdf`;
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file}"`,
    },
  });
}

/**
 * The page's "Full details" fields (Experience level, Can be home-based, Premises…) as text rows,
 * from the same admin field list. Member fields are "Members only" on gated pages, never their value.
 */
function extraFields(record: Record<string, unknown>, gated: boolean): [string, string, null][] {
  const currency = typeof record.currency === "string" ? record.currency : "UGX";
  return visibleGroups("BUSINESS_IDEA", record).flatMap(([, fields]) => fields).map((f) => {
    if (gated && isMemberOnly("BUSINESS_IDEA", f)) return [f.label, "Members only", null];
    const v = record[f.name];
    const text = f.kind === "bool" ? (v ? "Yes" : "No")
      : f.kind === "int" || f.kind === "decimal" ? (MONEY_FIELDS.has(f.name) ? money(v as number, currency) : Number(v).toLocaleString("en-GB"))
      : f.kind === "date" ? date(v as Date)
      : f.kind === "enum" ? titleCase(String(v)) ?? String(v)
      : f.kind === "list" ? (v as string[]).join(", ")
      : f.kind === "json" ? Object.entries(v as Record<string, unknown>).map(([k, x]) => `${titleCase(k) ?? k}: ${typeof x === "object" ? JSON.stringify(x) : String(x)}`).join("\n")
      : String(v);
    return [f.label, text, null];
  });
}

/**
 * A JPEG or PNG as bytes, or null. Site paths (/machines/…, /brand/…) are read from public/;
 * outside addresses are fetched with a short timeout so a slow image never holds up the PDF.
 */
async function loadImage(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith("/")) {
      const file = path.join(process.cwd(), "public", path.normalize(src).replace(/^([/\\])+/, ""));
      if (!file.startsWith(path.join(process.cwd(), "public"))) return null;
      return /\.(png|jpe?g)$/i.test(file) ? await readFile(file) : null;
    }
    if (!/^https:\/\//.test(src)) return null;
    const res = await fetch(src, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "BizSphere-Ug PDF" } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}
