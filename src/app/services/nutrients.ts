export const nutrients = {
  fiber: "Fiber",
  sugar: "Sugar",
  saturatedFat: "Saturated fat",
  sodium: "Sodium",
} as const;
export type Nutrient = keyof typeof nutrients;
export type Extras = Partial<Record<Nutrient, number>>;
export const keys = Object.keys(nutrients) as Nutrient[];
export const unit = (key: Nutrient) => (key === "sodium" ? "mg" : "g");
export function scaleExtras(value: Extras, scale = 1): Extras {
  return Object.fromEntries(
    keys
      .filter(
        (k) =>
          typeof value[k] === "number" &&
          Number.isFinite(value[k]) &&
          value[k]! >= 0,
      )
      .map((k) => [k, Math.round(value[k]! * scale * 100) / 100]),
  );
}
export function labelExtras(
  raw: Record<string, unknown>,
  grams?: number,
): Extras {
  const result: Extras = {};
  const names = {
    fiber: "fiber",
    sugar: "sugars",
    saturatedFat: "saturated-fat",
    sodium: "sodium",
  };
  for (const key of keys) {
    for (const suffix of ["serving", "100g"]) {
      const value = raw[names[key] + "_" + suffix];
      if (
        value == null ||
        value === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      )
        continue;
      if (suffix === "100g" && !grams) continue;
      result[key] =
        Number(value) *
        (key === "sodium" ? 1000 : 1) *
        (suffix === "serving" ? 1 : grams! / 100);
      break;
    }
  }
  return scaleExtras(result);
}
export type Nutrition = Extras & {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
export function recipePortion(
  items: { food: Nutrition; quantity: number }[],
  yieldCount: number,
): Nutrition {
  if (
    !items.length ||
    !Number.isFinite(yieldCount) ||
    yieldCount <= 0 ||
    items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0)
  )
    throw Error("Enter positive quantities and yield");
  const result: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of ["calories", "protein", "carbs", "fat", ...keys] as const) {
    if (items.every((i) => i.food[key] != null))
      result[key] =
        Math.round(
          (items.reduce((sum, i) => sum + i.food[key]! * i.quantity, 0) /
            yieldCount) *
            100,
        ) / 100;
  }
  return result;
}
