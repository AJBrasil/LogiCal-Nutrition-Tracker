import {keys,scaleExtras, type Extras} from "./nutrients.ts";

export interface ServingNutrition extends Extras {
  calories:number;
  protein:number;
  carbs:number;
  fat:number;
  grams?:number;
}

export interface PortionInfo {
  fdcId?:number;
  portions?:[string,number][];
  servings?:number;
  perServing?:ServingNutrition;
}

export function referencePortion(food:ServingNutrition & PortionInfo & {servingSize?:string}):ServingNutrition {
  const base = food.perServing ?? food;
  const {calories,protein,carbs,fat} = base;
  const label = food.servingSize || "";
  const weight = /(?:^|[\s(])(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/i.exec(label);
  const grams = base.grams ?? (weight ? Number(weight[1]) : undefined);
  const extras = Object.fromEntries(keys.filter(key => Number.isFinite(base[key]) && base[key]! >= 0).map(key => [key,base[key]]));
  return {calories,protein,carbs,fat,...extras,grams};
}

export function forServings(base:ServingNutrition, count:number):ServingNutrition {
  const scaled = (value:number) => Math.round(value * count * 100) / 100;
  return {calories:scaled(base.calories), protein:scaled(base.protein), carbs:scaled(base.carbs),
    fat:scaled(base.fat), ...scaleExtras(base,count), grams:base.grams == null ? undefined : scaled(base.grams)};
}

export function changePortionWeight(base:ServingNutrition, grams:number):ServingNutrition {
  const ratio = grams / base.grams!;
  const extras = Object.fromEntries(keys.filter(k => base[k] != null).map(k => [k,base[k]! * ratio]));
  return {calories:base.calories * ratio,protein:base.protein * ratio,carbs:base.carbs * ratio,
    fat:base.fat * ratio,...extras,grams};
}
