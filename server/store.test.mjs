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

test("upgrading clears the original quick meals once and preserves the diary", async () => {
  const { default: presets } = await import("../src/app/services/defaultFavorites.json", { with: { type: "json" } });
  const dir = mkdtempSync(join(tmpdir(), "logical-favorites-"));
  const file = join(dir, "test.sqlite");
  let store = openStore(file);
  try {
    assert.deepEqual(store.read(), {});
    store.db.exec("DELETE FROM setup; INSERT INTO setup VALUES (1)");
    const insert = store.db.prepare("INSERT INTO records VALUES (?,?)");
    for (const item of presets) insert.run("favorite:" + item.id, JSON.stringify(item));
    const mealKey = "meal:2026-11-26:" + presets[0].id;
    insert.run(mealKey, JSON.stringify(presets[0]));
    store.db.close();
    store = openStore(file);
    assert.deepEqual(store.read(), { [mealKey]: presets[0] });
    store.apply([{id: randomUUID(), changes: [["favorite:" + presets[0].id, presets[0]]]}]);
    store.db.close();
    store = openStore(file);
    assert.ok(store.read()["favorite:" + presets[0].id]);
  } finally {
    store.db.close();
    rmSync(dir, {recursive:true, force:true});
  }
});

test("water additions and a corrected daily weigh-in survive replay",()=>{
 const store=openStore(':memory:');
 try{
  const day='2026-11-26';const w1='water:'+day+':'+randomUUID(),w2='water:'+day+':'+randomUUID();
  const op={id:randomUUID(),changes:[[w1,250],[w2,350],['weight:'+day,170]]};
  store.apply([op]);store.apply([op]);store.apply([{id:randomUUID(),changes:[['weight:'+day,169.5]]}]);
  assert.equal(store.read()[w1]+store.read()[w2],600);assert.equal(store.read()['weight:'+day],169.5);
  assert.throws(()=>store.apply([{id:randomUUID(),changes:[[w1,-100]]}]));
 }finally{store.db.close();}
});

test("food search reads live SQLite rows, aliases and cached Open Food Facts products", () => {
  const store = openStore(":memory:");
  try {
    const food = {id:7, name:"House stew", alias:"usual lunch", calories:410, protein:20, carbs:40, fat:12,time:"afternoon"};
    const update = changes => store.apply([{id:randomUUID(), changes}]);
    update([["meal:2026-11-26:7",food],["favorite:7",{...food, calories:420}]]);
    assert.deepEqual(store.searchFoods(" USUAL ").map(x => [x.name,x.source,x.calories]), [["House stew","Saved food",420]]);
    update([["favorite:7",null]]);
    assert.equal(store.searchFoods("stew")[0].source,"Diary");
    store.cacheProducts([{...food, barcode:"123", name:"Banana yogurt"}]);
    assert.equal(store.searchFoods("ban")[0].source,"Open Food Facts");
    assert.deepEqual(store.searchFoods("_"),[]);
    assert.deepEqual(store.searchFoods("no such food"),[]);
  } finally {store.db.close();}
});
