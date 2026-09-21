import test from "node:test";
import assert from "node:assert/strict";

import {
  clampServingMultiplier,
  lookupBarcode,
  multiplierFromServingGrams,
  scaleBarcodeNutrition,
  type ScannedProduct,
} from "./barcodeService.ts";

function mockFetchProduct(product: unknown, status = 1) {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        status,
        product,
      }),
      { status: 200 }
    );
}

test("normalizes Open Food Facts serving nutrition as high confidence", async () => {
  mockFetchProduct({
    product_name: "Greek Yogurt",
    brands: "FAGE",
    serving_size: "1 cup (170g)",
    image_front_url: "https://example.com/yogurt.jpg",
    nutriments: {
      "energy-kcal_serving": 140,
      proteins_serving: 17,
      carbohydrates_serving: 6,
      fat_serving: 4,
    },
  });

  const result = await lookupBarcode(" 5201051000854 ");

  assert.equal(result.barcode, "5201051000854");
  assert.equal(result.name, "FAGE Greek Yogurt");
  assert.equal(result.brand, "FAGE");
  assert.equal(result.calories, 140);
  assert.equal(result.protein, 17);
  assert.equal(result.carbs, 6);
  assert.equal(result.fat, 4);
  assert.equal(result.servingSize, "1 cup (170g)");
  assert.equal(result.imageUrl, "https://example.com/yogurt.jpg");
  assert.equal(result.source, "openfoodfacts");
  assert.equal(result.confidence, "high");
});

test("falls back to 100g nutrition as medium confidence", async () => {
  mockFetchProduct({
    product_name: "Rolled Oats",
    brands: "Quaker",
    serving_size: "1/2 cup dry (40g)",
    serving_quantity: 40,
    nutriments: {
      "energy-kcal_100g": 375,
      proteins_100g: 13,
      carbohydrates_100g: 68,
      fat_100g: 7,
    },
  });

  const result = await lookupBarcode("0030000010404");

  assert.equal(result.name, "Quaker Rolled Oats");
  assert.equal(result.calories, 150);
  assert.equal(result.protein, 5);
  assert.equal(result.carbs, 27);
  assert.equal(result.fat, 3);
  assert.equal(result.servingSize, "1/2 cup dry (40g)");
  assert.equal(result.servingWeightGrams, 40);
  assert.equal(result.confidence, "medium");
});

test("uses local product data when Open Food Facts misses a known barcode", async () => {
  mockFetchProduct(null, 0);

  const result = await lookupBarcode("0888849000043");

  assert.equal(result.name, "Quest Nutrition Chocolate Chip Cookie Dough Protein Bar");
  assert.equal(result.calories, 200);
  assert.equal(result.protein, 21);
  assert.equal(result.source, "local_database");
  assert.equal(result.confidence, "medium");
});

test("uses editable fallback values for unknown barcodes", async () => {
  mockFetchProduct(null, 0);

  const result = await lookupBarcode("abc-123");

  assert.equal(result.barcode, "123");
  assert.equal(result.name, "Food Item (123)");
  assert.equal(result.calories, 150);
  assert.equal(result.protein, 10);
  assert.equal(result.carbs, 15);
  assert.equal(result.fat, 5);
  assert.equal(result.servingSize, "1 serving");
  assert.equal(result.confidence, "fallback");
});

test("scales barcode nutrition by serving multiplier", () => {
  const product: ScannedProduct = {
    barcode: "123",
    name: "Protein Bar",
    calories: 200,
    protein: 20,
    carbs: 24,
    fat: 6,
    servingSize: "1 bar (60g)",
    servingWeightGrams: 60,
    source: "openfoodfacts",
    confidence: "high",
  };

  const result = scaleBarcodeNutrition(product, 1.5);

  assert.equal(result.calories, 300);
  assert.equal(result.protein, 30);
  assert.equal(result.carbs, 36);
  assert.equal(result.fat, 9);
  assert.equal(result.servingSize, "1.5x 1 bar (60g)");
  assert.equal(result.servingWeightGrams, 90);
});

test("converts grams into a serving multiplier when product weight exists", () => {
  const product: ScannedProduct = {
    barcode: "123",
    name: "Oats",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    servingSize: "1/2 cup dry (40g)",
    servingWeightGrams: 40,
    source: "openfoodfacts",
    confidence: "medium",
  };

  assert.equal(multiplierFromServingGrams(product, 60), 1.5);
  assert.equal(clampServingMultiplier(0), 0.05);
  assert.equal(clampServingMultiplier(30), 20);
});
