import test from "node:test";
import assert from "node:assert/strict";

import {
  deleteEntry,
  exportAllUserDataJSON,
  formatDateKey,
  getDailyTotals,
  getEntriesForDate,
  getTargets,
  importUserDataJSON,
  resetAllData,
  saveEntry,
  saveTargets,
} from "./storageService.ts";

class MockMemoryStorage {
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

const mockStorage = new MockMemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  configurable: true,
});

test("logging flow: logs meals across periods, updates totals, deletes, and restores with undo", () => {
  mockStorage.clear();
  localStorage.setItem("logical_entries_by_date", "{}");
  const dateKey = "2026-09-21";

  // 1. Log Breakfast
  const breakfast = saveEntry(dateKey, {
    name: "Oatmeal with Almond Milk",
    calories: 250,
    protein: 8,
    carbs: 45,
    fat: 5,
    time: "morning",
    servingSize: "1 bowl",
  });

  // 2. Log Lunch
  const lunch = saveEntry(dateKey, {
    name: "Grilled Chicken Salad",
    calories: 450,
    protein: 42,
    carbs: 12,
    fat: 16,
    time: "afternoon",
    servingSize: "1 plate",
  });

  // 3. Log Dinner
  const dinner = saveEntry(dateKey, {
    name: "Salmon, Asparagus & Quinoa",
    calories: 600,
    protein: 48,
    carbs: 38,
    fat: 22,
    time: "evening",
    servingSize: "1 fillet",
  });

  // Check entries list (newest first)
  const currentEntries = getEntriesForDate(dateKey);
  assert.equal(currentEntries.length, 3);
  assert.equal(currentEntries[0]?.name, "Salmon, Asparagus & Quinoa");
  assert.equal(currentEntries[1]?.name, "Grilled Chicken Salad");
  assert.equal(currentEntries[2]?.name, "Oatmeal with Almond Milk");

  // Check rolling daily totals
  const totals = getDailyTotals(currentEntries);
  assert.equal(totals.calories, 1300); // 250 + 450 + 600
  assert.equal(totals.protein, 98); // 8 + 42 + 48
  assert.equal(totals.carbs, 95); // 45 + 12 + 38
  assert.equal(totals.fat, 43); // 5 + 16 + 22

  // 4. Delete Lunch
  const deletedLunch = deleteEntry(dateKey, lunch.id);
  assert.ok(deletedLunch);
  assert.equal(deletedLunch.id, lunch.id);

  const afterDeleteEntries = getEntriesForDate(dateKey);
  assert.equal(afterDeleteEntries.length, 2);
  const afterDeleteTotals = getDailyTotals(afterDeleteEntries);
  assert.equal(afterDeleteTotals.calories, 850); // 1300 - 450
  assert.equal(afterDeleteTotals.protein, 56); // 98 - 42

  // 5. Undo deletion
  saveEntry(dateKey, deletedLunch);
  const restoredEntries = getEntriesForDate(dateKey);
  assert.equal(restoredEntries.length, 3);
  const restoredTotals = getDailyTotals(restoredEntries);
  assert.equal(restoredTotals.calories, 1300);
});

test("logging flow: sanitizes negative or invalid nutrition entries safely", () => {
  mockStorage.clear();
  const dateKey = "2026-09-22";

  const entry = saveEntry(dateKey, {
    name: "   ",
    calories: -100,
    protein: NaN,
    carbs: 20,
    fat: 5,
    time: "morning",
  });

  assert.equal(entry.name, "Meal Entry");
  assert.equal(entry.calories, 0);
  assert.equal(entry.protein, 0);
  assert.equal(entry.carbs, 20);
  assert.equal(entry.fat, 5);
});

test("logging flow: export and import user data backup round-trip", () => {
  mockStorage.clear();
  const dateKey = "2026-09-23";

  saveTargets({
    phase: "bulk",
    weeklyRate: 0.5,
    calories: 3050,
    protein: 220,
    carbs: 350,
    fat: 75,
    proteinLocked: true,
  });

  saveEntry(dateKey, {
    name: "Steak and Sweet Potato",
    calories: 720,
    protein: 55,
    carbs: 60,
    fat: 24,
    time: "evening",
  });

  const exportedJSON = exportAllUserDataJSON();
  assert.ok(exportedJSON.length > 50);

  // Clear data
  resetAllData();
  assert.equal(getEntriesForDate(dateKey).length, 0);

  // Import data
  const success = importUserDataJSON(exportedJSON);
  assert.equal(success, true);

  const reloadedEntries = getEntriesForDate(dateKey);
  assert.equal(reloadedEntries.length, 1);
  assert.equal(reloadedEntries[0]?.name, "Steak and Sweet Potato");
  assert.equal(reloadedEntries[0]?.calories, 720);

  const reloadedTargets = getTargets();
  assert.equal(reloadedTargets.phase, "bulk");
  assert.equal(reloadedTargets.calories, 3050);
  assert.equal(reloadedTargets.proteinLocked, true);
});
