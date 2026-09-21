import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  calculateMacroCalories,
  calculateBasePhaseCalories,
  calculateMacroTargetRatio,
  isOnTarget,
  calculateAverage,
  calculateFluctuation,
  calculateBalancedProtein,
} from "./nutritionMath.ts";

test("clamp keeps values strictly within min and max boundaries", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(NaN, 0, 10), 0);
});

test("calculateMacroCalories accurately computes calorie sum (4/4/9 kcal/g)", () => {
  // 100g P (400) + 150g C (600) + 50g F (450) = 1450 kcal
  assert.equal(calculateMacroCalories(100, 150, 50), 1450);
  assert.equal(calculateMacroCalories(0, 0, 0), 0);
  assert.equal(calculateMacroCalories(-10, 50, 10), 290); // handles negative gracefully
});

test("calculateBasePhaseCalories calculates targets based on goal phase", () => {
  // baseline 2800
  // cut with 1.0 lb/week = 2800 - 500 = 2300
  assert.equal(calculateBasePhaseCalories("cut", 1.0), 2300);
  // cut with 0.5 lb/week = 2800 - 250 = 2550
  assert.equal(calculateBasePhaseCalories("cut", 0.5), 2550);
  // recomp = 2800
  assert.equal(calculateBasePhaseCalories("recomp", 1.0), 2800);
  // bulk with 1.0 lb/week = 2800 + 250 = 3050
  assert.equal(calculateBasePhaseCalories("bulk", 1.0), 3050);
});

test("calculateMacroTargetRatio clamps progress between 0 and 100", () => {
  assert.equal(calculateMacroTargetRatio(50, 100), 50);
  assert.equal(calculateMacroTargetRatio(150, 100), 100);
  assert.equal(calculateMacroTargetRatio(-10, 100), 0);
  assert.equal(calculateMacroTargetRatio(50, 0), 0);
});

test("isOnTarget correctly evaluates 10% bounds", () => {
  // Target = 2000; +/- 10% is [1800, 2200]
  assert.equal(isOnTarget(2000, 2000), true);
  assert.equal(isOnTarget(1900, 2000), true);
  assert.equal(isOnTarget(2150, 2000), true);
  assert.equal(isOnTarget(1750, 2000), false);
  assert.equal(isOnTarget(2250, 2000), false);
  assert.equal(isOnTarget(0, 2000), false);
  assert.equal(isOnTarget(100, 0), false);
});

test("calculateAverage computes rounded average or 0 for empty array", () => {
  assert.equal(calculateAverage([]), 0);
  assert.equal(calculateAverage([2000, 2100, 1900]), 2000);
  assert.equal(calculateAverage([100, 105]), 103);
});

test("calculateFluctuation measures percentage divergence from mean", () => {
  assert.equal(calculateFluctuation([]), 0);
  assert.equal(calculateFluctuation([0, 0]), 0);
  // all equal: 0% fluctuation
  assert.equal(calculateFluctuation([2000, 2000, 2000]), 0);
  // mean = 2000, deviations = 200 (10%) and 200 (10%) -> average 10%
  assert.equal(calculateFluctuation([1800, 2200]), 10);
});

test("calculateBalancedProtein calculates remaining protein within bounds", () => {
  // Target = 2000 kcal, Carbs = 200g (800 kcal), Fat = 50g (450 kcal)
  // Remaining = 2000 - 1250 = 750 kcal -> 750 / 4 = 187.5 -> 188g
  assert.equal(calculateBalancedProtein(2000, 200, 50), 188);
  // Clamping check
  assert.equal(calculateBalancedProtein(500, 200, 50), 100); // clamped to min 100
  assert.equal(calculateBalancedProtein(4000, 50, 20), 350); // clamped to max 350
});

