/** Layout for plain information pages (About, Methodology, Terms...). */
export function StaticPage({ title, intro, children, draft = false }: { title: string; intro?: string; children: React.ReactNode; draft?: boolean }) {
  return (
    <div className="container-site flex max-w-3xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title">{title}</h1>
        {intro ? <p className="text-base leading-relaxed text-ink-soft">{intro}</p> : null}
      </div>
      {draft ? (
        <p role="note" className="rounded-xl border border-[#E8C979] bg-warn-bg p-4 text-sm text-warn-fg">
          Draft for review. This page must be checked by a qualified lawyer before the site launches.
        </p>
      ) : null}
      <div className="prose-site flex flex-col gap-4 leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-xl font-bold text-ink">{children}</h2>;
}
