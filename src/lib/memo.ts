/**
 * Shares one database lookup between requests that arrive together on the same server copy.
 *
 * Opening a page with many links makes the browser prefetch them all at once, and each prefetch
 * runs the site layout, which looks up who the visitor is (membership, wishlist). With two database
 * connections per server copy, a page of twenty links queued forty identical queries and some timed
 * out ("Timed out fetching a new connection from the connection pool", live logs 7 Nov 2026). Kept for
 * a few seconds only, so a change (a payment, a saved item) shows on the next page almost at once.
 */
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function shortMemo<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ms) return hit.value as Promise<T>;
  const value = load();
  store.set(key, { at: now, value });
  // A failed lookup is never shared: the next request tries again
  value.catch(() => { if (store.get(key)?.value === value) store.delete(key); });
  if (store.size > 1000) for (const [k, v] of store) if (now - v.at >= ms) store.delete(k);
  return value;
}

/** Drops what is kept for these keys (e.g. right after a payment), so the next lookup is fresh. */
export function forgetMemo(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
