import test from "node:test";
import assert from "node:assert/strict";
import {everydayFoods} from "./catalog/search.mjs";

test("offline USDA search matches unordered preparation terms and record-specific portions", () => {
  const rice = everydayFoods("cooked white rice").find(f=>f.name.endsWith("no added fat"));
  assert.ok(rice && rice.fdcId && rice.calories > 0);
  assert.deepEqual(rice.portions.find(([name])=>name==="1 cup, cooked"),["1 cup, cooked",158]);
  assert.equal(rice.grams,100);
  assert.ok(everydayFoods("raw chicken breast").some(f=>f.name.endsWith("skinless, raw")));
  assert.deepEqual(everydayFoods('"*'),[]);
  assert.deepEqual(everydayFoods("zzzznotfood"),[]);
});
