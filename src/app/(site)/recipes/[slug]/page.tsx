import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { minutes } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { FakeRows, trackView } from "@/components/DetailParts";
import { RecordPage } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Recipe Name, Category, Ingredients, Steps, Remark, Video Link
export default async function RecipePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "RECIPE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      recipe: { include: { ingredients: { orderBy: { order: "asc" } }, steps: { orderBy: { stepNumber: "asc" } } } },
    },
  });
  if (!item?.recipe) notFound();
  const r = item.recipe;
  const path = `/recipes/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Visitors see the ingredients and the first steps.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const steps = gated ? r.steps.slice(0, FREE_PREVIEW.steps) : r.steps;

  return (
    <RecordPage
      trail={["/recipes", "Cooking recipes"]}
      eyebrow={`Recipe · ${item.primaryCategory?.name ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[{ label: "Category", value: item.primaryCategory?.name }]}
      links={[{ label: "Watch the video", href: r.videoUrl, icon: "video" }]}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to see the full recipe"
    >
      {item.overview ? (
        <section className="card flex flex-col gap-3 p-7">
          <h2 className="text-lg font-bold">About this recipe</h2>
          <p className="whitespace-pre-line leading-relaxed text-ink-soft">{item.overview}</p>
        </section>
      ) : null}

      <section className="card flex flex-col gap-3 p-7">
        <h2 className="text-lg font-bold">Ingredients</h2>
        {r.ingredients.length === 0 ? <p className="text-sm text-ink-muted">Not added yet.</p> : (
          <ul className="flex flex-col">
            {r.ingredients.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
                <span>{i.name}{i.prepNote ? <span className="text-ink-muted">, {i.prepNote}</span> : null}</span>
                <span className="whitespace-nowrap font-semibold">{i.quantity === null ? <span className="font-normal text-ink-muted">to taste / to be confirmed</span> : `${Number(i.quantity)} ${i.unit ?? ""}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3.5 p-7">
        <h2 className="text-lg font-bold">Steps</h2>
        {r.steps.length === 0 ? <p className="text-sm text-ink-muted">Not added yet.</p> : null}
        <ol className="flex flex-col gap-3.5">
          {steps.map((s) => (
            <li key={s.id} className="flex gap-3.5">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{s.stepNumber}</span>
              <span>{s.instruction}{s.durationMinutes || s.temperatureC ? <span className="block text-sm text-ink-muted">{[s.durationMinutes && minutes(s.durationMinutes), s.temperatureC && `${s.temperatureC} °C`].filter(Boolean).join(" · ")}</span> : null}</span>
            </li>
          ))}
        </ol>
        {gated && r.steps.length > steps.length ? <Gate compact button={`Show ${r.steps.length - steps.length} more step(s)`} modalTitle="Subscribe to see the full recipe" teaser={<FakeRows n={2} label="Step hidden" value="" />} /> : null}
      </section>

      <section className="card flex flex-col gap-3 p-7">
        <h2 className="text-lg font-bold">Remark</h2>
        {r.remarks ? <p className="whitespace-pre-line leading-relaxed text-ink-soft">{r.remarks}</p> : <p className="text-sm text-ink-muted">Not added yet.</p>}
      </section>
    </RecordPage>
  );
}
