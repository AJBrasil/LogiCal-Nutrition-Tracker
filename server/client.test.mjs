import test from "node:test";
import assert from "node:assert/strict";
import { openStore } from "./store.mjs";

test("offline queue replays after lost acknowledgment and goals keep their effective dates", async () => {
  const storage = {};
  Object.defineProperties(storage, {
    getItem: { value: (k) => storage[k] ?? null },
    setItem: {
      value: (k, v) => {
        storage[k] = v;
      },
    },
    removeItem: {
      value: (k) => {
        delete storage[k];
      },
    },
  });
  globalThis.localStorage = storage;
  const events = new EventTarget();
  const db = openStore(":memory:");
  let connection = false,
    loseReply = false;
  globalThis.window = events;
  globalThis.fetch = events.fetch = async (path, opts = {}) => {
    if (!connection) throw Error("offline");
    if (opts.body) db.apply(JSON.parse(opts.body));
    if (loseReply) {
      loseReply = false;
      throw Error("interrupted");
    }
    return Response.json({ records: db.read(), exports: db.status() });
  };
  const sync = await import("../src/app/services/serverSync.ts");
  const data = await import("../src/app/services/storageService.ts");
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const meal = data.saveEntry("2026-11-26", {
    name: "Lunch",
    time: "afternoon",
    calories: 200,
    protein: 20,
    carbs: 15,
    fat: 5,
  });
  await tick();
  assert.equal(sync.syncLabel(), "Pending");
  connection = true;
  loseReply = true;
  await sync.refresh();
  assert.equal(sync.syncLabel(), "Pending");
  await sync.refresh();
  assert.equal(sync.syncLabel(), "Saved");
  assert.equal(data.getEntriesForDate("2026-11-26").length, 1);
  assert.ok(db.read()["meal:2026-11-26:" + meal.id]);
  data.saveTargets({ ...data.DEFAULT_TARGETS, calories: 2100 }, "2026-11-01");
  data.saveTargets({ ...data.DEFAULT_TARGETS, calories: 2500 }, "2026-12-01");
  await tick();
  assert.equal(data.getTargets("2026-11-26").calories, 2100);
  assert.equal(data.getTargets("2026-12-03").calories, 2500);
  db.db.close();
});
