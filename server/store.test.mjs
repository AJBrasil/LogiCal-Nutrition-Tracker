import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { openStore } from "./store.mjs";

test("retry, independent device edit, export receipt, restart and backup restore", () => {
  const dir = mkdtempSync(join(tmpdir(), "logical-"));
  const file = join(dir, "test.sqlite");
  let store = openStore(file);
  try {
    const meal = "meal:2026-11-26:123";
    const food = {
      id: 123,
      name: "Chicken",
      time: "afternoon",
      calories: 185,
      protein: 35,
      carbs: 0,
      fat: 4,
    };
    const first = { id: randomUUID(), changes: [[meal, food]] };
    store.apply([first]);
    store.apply([
      { id: randomUUID(), changes: [[meal, { ...food, calories: 200 }]] },
    ]);
    store.apply([first]);
    assert.equal(store.read()[meal].calories, 200);
    assert.throws(() =>
      store.apply([
        {
          id: randomUUID(),
          changes: [
            [meal, null],
            ["bad", 1],
          ],
        },
      ]),
    );
    const payload = store.reserve(meal, "2026-11-26T12:00:00Z");
    assert.throws(() => store.reserve(meal, payload.date));
    store.confirm(payload.ticket);
    store.confirm(payload.ticket);
    store.db.close();
    store = openStore(file);
    assert.equal(store.status()[meal], "confirmed");
    execFileSync(process.execPath, ["server/backup.mjs", dir], {
      env: { ...process.env, LOGICAL_DB: file, LOGICAL_TEST_BACKUP: "1" },
    });
    const restored = openStore(
      join(dir, "LogiCal-" + new Date().toISOString().slice(0, 10) + ".sqlite"),
    );
    assert.deepEqual(restored.read(), store.read());
    assert.deepEqual(restored.status(), store.status());
    restored.db.close();
  } finally {
    store.db.close();
    rmSync(dir, { recursive: true });
  }
});
