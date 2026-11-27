import {changePortionWeight,forServings,referencePortion} from "./portions.ts";
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDateKey,
  getDailyTotals,
  getEntriesForDate,
  resetAllData,
  saveEntry,
} from "./storageService.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

test("formats date keys in local calendar time", () => {
  assert.equal(formatDateKey(new Date(2026, 8, 21)), "2026-09-21");
});

test("saves and reloads entries by date", () => {
  storage.clear();
  const dateKey = "2026-09-21";
  localStorage.setItem("logical_entries_by_date", "{}");

  const saved = saveEntry(dateKey, {
    name: "Greek yogurt",
    calories: 140,
    protein: 18,
    carbs: 6,
    fat: 4,
    time: "morning",
    servingSize: "1 cup",
  });

  const entries = getEntriesForDate(dateKey);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, saved.id);
  assert.equal(entries[0]?.name, "Greek yogurt");
});

test("normalizes invalid stored nutrition numbers to zero", () => {
  storage.clear();
  localStorage.setItem(
    "logical_entries_by_date",
    JSON.stringify({
      "2026-09-21": [
        {
          id: 1,
          name: "Bad import",
          calories: "not a number",
          protein: 10,
          carbs: undefined,
          fat: 5,
          time: "evening",
        },
      ],
    })
  );

  const entries = getEntriesForDate("2026-09-21");
  assert.equal(entries[0]?.calories, 0);
  assert.equal(entries[0]?.carbs, 0);
  assert.equal(getDailyTotals(entries).protein, 10);
});

test("the diary preserves one serving independently of the amount eaten", () => {
  const food = {name:"Oats", time:"morning" as const, servingSize:"½ cup (40 g)", calories:150, protein:5, carbs:27, fat:3, fiber:4};
  const perServing = referencePortion(food);
  assert.equal(perServing.grams,40);
  const logged = saveEntry("2026-10-15",{...food,...forServings(perServing,1.5),perServing,servings:1.5});
  const stored = getEntriesForDate("2026-10-15").find(entry=>entry.id === logged.id)!;
  assert.equal(stored.servingSize,food.servingSize);
  assert.equal(stored.servings,1.5);
  assert.equal(stored.grams,60);
  assert.equal(stored.calories,225);
  assert.equal(stored.fiber,6);
  assert.deepEqual(forServings(referencePortion(stored),1),perServing);
});

test("a portion with only a volume has unknown mass", () => {
  const base = referencePortion({servingSize:"250 ml",calories:100,protein:5,carbs:10,fat:4});
  assert.equal(forServings(base,2).grams,undefined);
});

test("fractional per-serving edits preserve the entered total on reopening", () => {
  const base = referencePortion({calories:160,carbs:26,protein:5,fat:3,fiber:7/1.5});
  const totals = forServings(base,1.5);
  assert.equal(totals.calories,240);
  assert.equal(totals.fiber,7);
  assert.equal(forServings(referencePortion({...totals,perServing:base}),3).fiber,14);
});

test("USDA gram and household measures persist with the consumed nutrients", () => {
  const rice = {name:"Cooked rice",time:"morning" as const, servings:1.5,fdcId:123,portions:[["1 cup",158]] as [string,number][],
    servingSize:"1 cup",calories:130,carbs:28,protein:2.7,fat:.3,grams:100};
  const base = changePortionWeight(rice,158);
  const saved = saveEntry("2026-10-18",{...rice,...forServings(base,1.5),perServing:base});
  const restored = getEntriesForDate("2026-10-18").find(f=>f.id===saved.id);
  assert.equal(restored.grams,237);
  assert.equal(restored.calories,308.1);
  assert.equal(restored.fdcId,123);
  assert.deepEqual(restored.portions,rice.portions);
  assert.equal(forServings(changePortionWeight(base,1),150).calories,195);
});
