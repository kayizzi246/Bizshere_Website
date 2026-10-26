import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, minutes, money } from "@/lib/format";
import { calculateRecipeCosting } from "@/lib/costing";
import { Gate } from "@/components/Gate";
import { Card, Connected, Crumbs, Evidence, Facts, FakeRows, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "RECIPE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      recipe: {
        include: {
          ingredients: { orderBy: { order: "asc" } },
          steps: { orderBy: { stepNumber: "asc" } },
          costings: { include: { location: true, lines: true }, orderBy: { costedAt: "desc" }, take: 1 },
        },
      },
    },
  });
  if (!item?.recipe) notFound();
  const r = item.recipe;
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const steps = gated ? r.steps.slice(0, FREE_PREVIEW.steps) : r.steps;
  const costing = gated ? null : r.costings[0];
  const calc = costing ? calculateRecipeCosting(costing) : null;
  const path = `/recipes/${item.slug}`;
  await trackView(viewer, item.id, path);

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/guides", "Guides and tools"], ["/recipes", "Recipes"]]} title={item.title} />
      <Identity eyebrow={`Recipe · ${item.primaryCategory?.name ?? r.cuisine ?? "General"}`} title={item.title} summary={item.shortSummary} />

      <Facts items={[
        ["Yield", r.yieldQuantity ? `${r.yieldQuantity} ${r.yieldUnit ?? ""}` : r.servings ? `${r.servings} servings` : "—"],
        ["Preparation", minutes(r.prepMinutes)],
        ["Cooking", minutes(r.cookMinutes)],
        ["Skill level", r.skillLevel ?? "—"],
      ]} />

      <TwoColumn
        main={<>
          {item.overview ? <Card title="About this recipe"><Prose text={item.overview} /></Card> : null}
          <Card title="Ingredients">
            {r.ingredients.length === 0 ? <p className="text-sm text-ink-muted">Not yet recorded.</p> : (
              <ul className="flex flex-col">
                {r.ingredients.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
                    <span>{i.name}{i.prepNote ? <span className="text-ink-muted">, {i.prepNote}</span> : null}{i.substitute ? <span className="block text-xs text-ink-muted">Substitute: {i.substitute}</span> : null}</span>
                    <span className="whitespace-nowrap font-semibold">{i.quantity === null ? <span className="font-normal text-ink-muted">to be confirmed</span> : `${Number(i.quantity)} ${i.unit ?? ""}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Method">
            <ol className="flex flex-col gap-3.5">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-3.5">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{s.stepNumber}</span>
                  <span>{s.instruction}{s.durationMinutes || s.temperatureC ? <span className="block text-sm text-ink-muted">{[s.durationMinutes && minutes(s.durationMinutes), s.temperatureC && `${s.temperatureC} °C`].filter(Boolean).join(" · ")}</span> : null}</span>
                </li>
              ))}
            </ol>
            {gated && r.steps.length > steps.length ? <Gate compact button={`Show ${r.steps.length - steps.length} more step(s)`} modalTitle="Subscribe to see the full recipe" teaser={<FakeRows n={2} label="Step hidden" value="" />} /> : null}
          </Card>
          <Card title="Batch costing">
            {gated ? (
              <Gate title="See the batch costing" text="Ingredient, packaging, energy and labour costs, cost per portion and margin." modalTitle="Subscribe to see recipe costings" teaser={<FakeRows n={4} />} />
            ) : !costing ? (
              <p className="text-sm text-ink-muted">No dated costing yet.</p>
            ) : (
              <>
                <span className="text-sm text-ink-muted">Costed {date(costing.costedAt)} using prices from {costing.location?.name ?? "Uganda"}. Prices change; check current prices before you set yours.</span>
                <Rows rows={[
                  ["Ingredients", money(calc!.ingredients, costing.currency, "Some prices not yet sourced")],
                  ["Packaging", money(costing.packagingCost, costing.currency)],
                  ["Energy", money(costing.energyCost, costing.currency)],
                  ["Labour", money(costing.labourCost, costing.currency)],
                  ["Batch cost", money(calc!.batch, costing.currency, "Incomplete")],
                  ["Usable portions", calc!.usablePortions !== null ? `${calc!.usablePortions.toFixed(1)} (${costing.portionSize ?? "portion"}, after ${Number(costing.wastagePercent ?? 0)}% wastage)` : "—"],
                  ["Cost per portion", money(calc!.perPortion, costing.currency, "Incomplete")],
                  ["Proposed selling price", money(costing.sellingPrice, costing.currency)],
                  ["Margin", calc!.margin !== null ? `${(calc!.margin * 100).toFixed(0)}%` : "—"],
                ]} />
              </>
            )}
          </Card>
        </>}
        aside={<>
          <Card title="Food information" className="p-6">
            <Rows rows={[
              ["Allergens", r.allergens.join(", ")],
              ["Dietary", r.dietaryLabels.join(", ")],
              ["Equipment", r.equipment],
              ["Storage", r.storage],
              // Shelf-life is only shown with supporting evidence (blueprint 10).
              ["Shelf life", r.shelfLife && r.shelfLifeEvidence ? r.shelfLife : null],
            ]} />
          </Card>
          {r.videoUrl ? <Card title="Video" className="p-6"><a href={r.videoUrl} target="_blank" rel="noreferrer" className="btn-outline">Watch the video ↗</a></Card> : null}
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} title="Businesses and equipment" />
        </>}
      />
    </div>
  );
}
