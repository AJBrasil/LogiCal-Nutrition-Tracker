import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_FAVORITE_MEALS,
  exportAllUserDataJSON,
  formatDateKey,
  getFavoriteMeals,
  getRecentMeals,
  importUserDataJSON,
  isFavoriteMeal,
  removeFavoriteMeal,
  resetAllData,
  saveEntry,
  saveFavoriteMeal,
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

test("favorites: loads default curated favorites when storage is uninitialized", () => {
  mockStorage.clear();
  const favorites = getFavoriteMeals();
  assert.equal(favorites.length, DEFAULT_FAVORITE_MEALS.length);
  assert.equal(favorites[0]?.name, "Whey Protein Shake");
});

test("favorites: adds custom favorite meal and deduplicates existing name", () => {
  mockStorage.clear();
  const newFav = saveFavoriteMeal({
    name: "Custom Double Protein Smoothie",
    calories: 320,
    protein: 50,
    carbs: 15,
    fat: 6,
    time: "morning",
    servingSize: "24 oz",
  });

  assert.equal(isFavoriteMeal("Custom Double Protein Smoothie"), true);
  assert.equal(isFavoriteMeal("custom double protein smoothie"), true); // case-insensitive check
  assert.equal(isFavoriteMeal("Nonexistent Meal"), false);

  const favs = getFavoriteMeals();
  assert.equal(favs[0]?.name, "Custom Double Protein Smoothie");

  // Re-saving same name replaces rather than duplicates
  const updated = saveFavoriteMeal({
    name: "Custom Double Protein Smoothie",
    calories: 350,
    protein: 55,
    carbs: 15,
    fat: 7,
    time: "morning",
  });

  const updatedFavs = getFavoriteMeals();
  const matches = updatedFavs.filter((f) => f.name.toLowerCase() === "custom double protein smoothie");
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.calories, 350);

  // Remove favorite
  removeFavoriteMeal(updated.id);
  assert.equal(isFavoriteMeal("Custom Double Protein Smoothie"), false);
});

test("recents: extracts unique recent meals across multiple dates", () => {
  mockStorage.clear();
  localStorage.setItem("logical_entries_by_date", "{}");

  const today = new Date();
  const todayKey = formatDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  saveEntry(todayKey, {
    name: "Salmon Bowl",
    calories: 550,
    protein: 45,
    carbs: 40,
    fat: 18,
    time: "evening",
  });

  saveEntry(yesterdayKey, {
    name: "Oatmeal and Berries",
    calories: 280,
    protein: 10,
    carbs: 50,
    fat: 5,
    time: "morning",
  });

  // Duplicate name on earlier date
  saveEntry(yesterdayKey, {
    name: "salmon bowl",
    calories: 550,
    protein: 45,
    carbs: 40,
    fat: 18,
    time: "afternoon",
  });

  const recents = getRecentMeals(5);
  assert.equal(recents.length, 2);
  assert.equal(recents[0]?.name, "Salmon Bowl");
  assert.equal(recents[1]?.name, "Oatmeal and Berries");
});

test("favorites: export and import round-trip preserves custom favorites", () => {
  mockStorage.clear();
  saveFavoriteMeal({
    name: "Pre-Workout Rice Cakes with PB",
    calories: 220,
    protein: 8,
    carbs: 32,
    fat: 7,
    time: "afternoon",
  });

  const exported = exportAllUserDataJSON();
  resetAllData();

  assert.equal(isFavoriteMeal("Pre-Workout Rice Cakes with PB"), false);

  const imported = importUserDataJSON(exported);
  assert.equal(imported, true);
  assert.equal(isFavoriteMeal("Pre-Workout Rice Cakes with PB"), true);
});
