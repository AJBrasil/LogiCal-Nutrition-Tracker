// Each mutation has its own durable key, so independent tabs can enqueue safely.
const prefix = "logical.pending.";
const cacheKey = "logical.server.snapshot";
type Records = Record<string, any>;
type Change = [string, any];
type Mutation = { id: string; changes: Change[]; order: number };
export let lastBackup:string|null=null;
export let healthExports: Record<string, string> =
  typeof window === "undefined"
    ? {}
    : JSON.parse(localStorage.getItem("logical.receipts") || "{}");
let busy = false;
let lastOrder = 0;
let online = false;
const active =
  typeof window !== "undefined" && typeof window.fetch === "function";
function base(): Records {
  return JSON.parse(localStorage.getItem(cacheKey) || "{}");
}
function queued(): Mutation[] {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .map((k) => JSON.parse(localStorage.getItem(k)!))
    .sort((a, b) => a.order - b.order);
}
export function records(): Records {
  const result = base();
  for (const op of queued())
    for (const [key, value] of op.changes) {
      if (value === null) delete result[key];
      else result[key] = value;
    }
  return result;
}
export function change(changes: Change[]) {
  if (!changes.length) return;
  const id = crypto.randomUUID();
  lastOrder = Math.max(Date.now(), lastOrder + 0.001);
  localStorage.setItem(
    prefix + id,
    JSON.stringify({ id, changes, order: lastOrder }),
  );
  notify();
  void refresh();
}
function notify() {
  window.dispatchEvent(new Event("logical-state"));
}
export function syncLabel() {
  return queued().length ? "Pending" : online ? "Saved" : "Offline";
}
export function isReady() {
  return !!localStorage.getItem(cacheKey);
}
export async function post(path: string, body: unknown) {
  const r = await fetch("/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw Error((await r.json()).error || "Server unavailable");
  return r.json();
}
export async function refresh() {
  if (busy || !active) return;
  busy = true;
  try {
    const syncOnce = async () => {
      const ops = queued().slice(0, 100);
      const data = ops.length
        ? await post("sync", ops)
        : await (
            await fetch("/api/state", {
              cache: "no-store",
              signal: AbortSignal.timeout(12000),
            })
          ).json();
      if (!data.records) throw Error("Missing server data");
      localStorage.setItem(cacheKey, JSON.stringify(data.records));
      healthExports = data.exports;
      lastBackup=data.lastBackup??null;
      localStorage.setItem("logical.receipts", JSON.stringify(data.exports));
      for (const op of ops) localStorage.removeItem(prefix + op.id);
      online = true;
    };
    if (globalThis.navigator?.locks)
      await navigator.locks.request("logical-server-sync", syncOnce);
    else await syncOnce();
  } catch {
    online = false;
  } finally {
    busy = false;
    notify();
  }
  if (online && queued().length) void refresh();
}
export function startSync() {
  void refresh();
  for (const event of ["online", "focus"])
    window.addEventListener(event, refresh);
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("logical.")) notify();
  });
  setInterval(refresh, 5000);
}
export const serverMode = active;
