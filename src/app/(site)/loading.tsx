/**
 * Shown the moment a link is tapped, while the next page loads on the server (and prefetched
 * for links on screen, so it appears instantly). Header and footer stay in place.
 */
export default function SiteLoading() {
  const bar = "animate-pulse rounded-lg bg-page";
  return (
    <div role="status" aria-label="Loading" className="bg-white">
      <div className="border-b border-line">
        <div className="container-site flex flex-col gap-4 py-8 sm:py-10">
          <div className={`${bar} h-11 w-11 rounded-2xl`} />
          <div className={`${bar} h-9 w-2/3 max-w-md`} />
          <div className={`${bar} h-4 w-full max-w-xl`} />
          <div className={`${bar} h-4 w-4/5 max-w-lg`} />
        </div>
      </div>
      <div className="container-site flex flex-col gap-6 py-8">
        <div className={`${bar} h-14 w-full rounded-2xl`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line p-5">
              <div className={`${bar} aspect-[4/3] w-full rounded-xl`} />
              <div className={`${bar} h-5 w-3/4`} />
              <div className={`${bar} h-3.5 w-full`} />
              <div className={`${bar} h-3.5 w-2/3`} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
