import {scaleExtras, type Extras} from "./nutrients.ts";

export interface ServingNutrition extends Extras {
  calories:number;
  protein:number;
  carbs:number;
  fat:number;
  grams?:number;
}

export interface PortionInfo {
  servings?:number;
  perServing?:ServingNutrition;
}

export function referencePortion(food:ServingNutrition & PortionInfo & {servingSize?:string}):ServingNutrition {
  const base = food.perServing ?? food;
  const {calories,protein,carbs,fat} = base;
  const label = food.servingSize || "";
  const weight = /(?:^|[\s(])(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i.exec(label);
  const grams = base.grams ?? (weight ? Number(weight[1]) : undefined);
  return {calories,protein,carbs,fat,...scaleExtras(base),grams};
}

export function forServings(base:ServingNutrition, count:number):ServingNutrition {
  const scaled = (value:number) => Math.round(value * count * 100) / 100;
  return {calories:scaled(base.calories), protein:scaled(base.protein), carbs:scaled(base.carbs),
    fat:scaled(base.fat), ...scaleExtras(base,count), grams:base.grams == null ? undefined : scaled(base.grams)};
}
