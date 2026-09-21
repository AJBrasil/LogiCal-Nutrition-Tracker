import test from "node:test";
import assert from "node:assert/strict";

import { buildHealthPayload, healthSampleTimestamp } from "./appleHealthService.ts";

test("builds Apple Health payload using enabled metrics only", () => {
  const payload = buildHealthPayload(
    [
      {
        id: 1,
        name: "Meal",
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 10,
        time: "afternoon",
      },
    ],
    "2026-09-21",
    {
      autoSync: false,
      syncCalories: true,
      syncProtein: false,
      syncCarbs: true,
      syncFat: false,
      lastSyncTimestamp: null,
    }
  );

  assert.equal(payload.date, "2026-09-21");
  assert.equal(payload.calories, 500);
  assert.equal(payload.protein, 0);
  assert.equal(payload.carbohydrates, 50);
  assert.equal(payload.fat, 0);
});

test("anchors HealthKit samples to the selected date at noon", () => {
  const timestamp = healthSampleTimestamp("2026-09-21");

  assert.match(timestamp, /^2026-09-21T/);
});
