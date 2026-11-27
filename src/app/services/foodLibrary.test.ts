import test from "node:test";
import assert from "node:assert/strict";
import { labelExtras, recipePortion } from "./nutrients.ts";
import { decodeRetailLine } from "./retailBarcode.ts";
import { parseFoodNaturalLanguage } from "./foodParserService.ts";

test("nutrition labels preserve zero and scale sodium to mg", () => {
  assert.deepEqual(
    labelExtras({ sodium_100g: 0.4, fiber_serving: 0, sugars_100g: 10 }, 50),
    { sodium: 200, fiber: 0, sugar: 5 },
  );
  assert.deepEqual(labelExtras({ sodium_100g: 0.4 }), {});
});
test("batch yield scales ingredient servings and preserves incomplete nutrients", () => {
  const food = { calories: 100, protein: 5, fat: 2, carbs: 15, fiber: 3 };
  const meal = recipePortion(
    [
      { food, quantity: 2 },
      { food: { ...food, fiber: undefined }, quantity: 1 },
    ],
    2,
  );
  assert.equal(meal.calories, 150);
  assert.equal(meal.protein, 7.5);
  assert.equal(meal.fiber, undefined);
  assert.throws(() => recipePortion([], 0));
});
test("personal food weights and label fields scale together", () => {
  const food = {
    name: "House cereal",
    grams: 40,
    calories: 150,
    protein: 5,
    carbs: 22,
    fat: 3,
    fiber: 2,
  };
  const result = parseFoodNaturalLanguage("60 g house cereal", [food]);
  assert.equal(result.calories, 225);
  assert.equal(result.fiber, 3);
  assert.equal(result.sodium, undefined);
});
test("retail scanner reads EAN-8 scanlines in either direction and rejects a bad checksum", () => {
  const left = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ];
  function scan(code: string) {
    const bits =
      "000000000101" +
      [...code.slice(0, 4)].map((d) => left[+d]).join("") +
      "01010" +
      [...code.slice(4)]
        .map((d) => left[+d].replace(/./g, (c) => (c === "1" ? "0" : "1")))
        .join("") +
      "101000000000";
    return [...bits].flatMap((b) => Array(3).fill(b === "1" ? 20 : 220));
  }
  const pixels = scan("96385074");
  assert.equal(decodeRetailLine(pixels), "96385074");
  assert.equal(decodeRetailLine(pixels.reverse()), "96385074");
  assert.equal(decodeRetailLine(scan("96385075")), null);
});

test("EAN-13 with mixed parity and UPC-A with a leading zero", () => {
  const L = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ];
  const invert = (s: string) => s.replace(/./g, (c) => (c === "1" ? "0" : "1"));
  for (const [code, parity] of [
    ["4006381333931", "LGLLGG"],
    ["0036000291452", "LLLLLL"],
  ]) {
    const left = [...code.slice(1, 7)]
      .map((d, i) =>
        parity[i] === "L" ? L[+d] : [...invert(L[+d])].reverse().join(""),
      )
      .join("");
    const bits =
      "000000000101" +
      left +
      "01010" +
      [...code.slice(7)].map((d) => invert(L[+d])).join("") +
      "101000000000";
    assert.equal(
      decodeRetailLine(
        [...bits].flatMap((b) => Array(4).fill(b === "1" ? 16 : 245)),
      ),
      code,
    );
  }
});
