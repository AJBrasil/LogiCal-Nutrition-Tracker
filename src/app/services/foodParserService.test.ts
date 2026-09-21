import test from "node:test";
import assert from "node:assert/strict";

import { parseFoodNaturalLanguage } from "./foodParserService.ts";

test("parses explicit macro shorthand", () => {
  const result = parseFoodNaturalLanguage("turkey bowl 500 cal 40p 50c 10f");

  assert.equal(result.name, "turkey bowl");
  assert.equal(result.calories, 500);
  assert.equal(result.protein, 40);
  assert.equal(result.carbs, 50);
  assert.equal(result.fat, 10);
  assert.equal(result.confidence, "exact_macros");
});

test("estimates common foods from natural language", () => {
  const result = parseFoodNaturalLanguage("3 eggs and sourdough toast");

  assert.equal(result.confidence, "parsed_ingredients");
  assert.equal(result.calories, 330);
  assert.equal(result.protein, 22);
  assert.equal(result.carbs, 26);
  assert.equal(result.fat, 16);
  assert.deepEqual(result.ingredients, ["Large Egg", "Sourdough Toast"]);
});

test("uses fallback estimate for unknown foods", () => {
  const result = parseFoodNaturalLanguage("mystery leftovers");

  assert.equal(result.confidence, "fallback_estimate");
  assert.equal(result.calories, 150);
});
