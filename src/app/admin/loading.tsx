/** Shown in the content area while the next admin page loads: a skeleton of a typical page. */
export default function AdminLoading() {
  const bar = "animate-pulse rounded-lg bg-line/70";
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className={`${bar} h-7 w-56`} />
        <div className={`${bar} h-4 w-80 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} h-8 w-20`} />
            <div className={`${bar} h-3 w-16`} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
        <div className={`${bar} h-5 w-40`} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className={`${bar} h-9 w-9 rounded-full`} />
            <div className="flex flex-1 flex-col gap-1.5"><div className={`${bar} h-3.5 w-1/2`} /><div className={`${bar} h-3 w-1/3`} /></div>
            <div className={`${bar} h-4 w-16`} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
