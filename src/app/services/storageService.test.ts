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
