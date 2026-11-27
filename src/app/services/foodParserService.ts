import COMMON_FOODS from "./commonFoods.json" with {type:"json"};
import {keys,scaleExtras,type Extras} from "./nutrients.ts";
export interface ParsedFoodResult extends Extras {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "exact_macros" | "parsed_ingredients" | "unmatched";
  ingredients?: string[];
}

/**
 * Check if the text contains direct macro shorthand like:
 * "500 cal 40p 50c 10f" or "400 kcal 30p" or "350 calories"
 */
function tryParseDirectMacros(input: string): ParsedFoodResult | null {
  const text = input.toLowerCase();

  // Pattern: looks for cal/kcal, p/protein, c/carb/carbs, f/fat
  const calMatch = text.match(/(\d+)\s*(?:cal(?:ories)?|cals|kcal)\b/i);
  const pMatch = text.match(/(\d+)\s*(?:g\s*protein|protein|pro|p)\b/i);
  const cMatch = text.match(/(\d+)\s*(?:g\s*carbs?|carbs?|c(?![a-z]))\b/i);
  const fMatch = text.match(/(\d+)\s*(?:g\s*fat|fats?|f(?![a-z]))\b/i);

  if (calMatch || (pMatch && (cMatch || fMatch))) {
    let calories = calMatch ? parseInt(calMatch[1], 10) : 0;
    const protein = pMatch ? parseInt(pMatch[1], 10) : 0;
    const carbs = cMatch ? parseInt(cMatch[1], 10) : 0;
    const fat = fMatch ? parseInt(fMatch[1], 10) : 0;

    if (calories === 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      calories = protein * 4 + carbs * 4 + fat * 9;
    }

    // Clean food name by removing the macro numbers
    const cleanName = input
      .replace(/(\d+)\s*(?:cal(?:ories)?|cals|kcal)\b/gi, "")
      .replace(/(\d+)\s*(?:g\s*protein|protein|pro|p)\b/gi, "")
      .replace(/(\d+)\s*(?:g\s*carbs?|carbs?|c(?![a-z]))\b/gi, "")
      .replace(/(\d+)\s*(?:g\s*fat|fats?|f(?![a-z]))\b/gi, "")
      .trim();

    return {
      name: cleanName || "Quick Macro Entry",
      calories,
      protein,
      carbs,
      fat,
      confidence: "exact_macros",
    };
  }

  return null;
}

/**
 * Parse natural language strings like:
 * "3 eggs and sourdough toast" or "chicken breast with rice"
 */
export function parseFoodNaturalLanguage(input: string, favorites: (Extras & {grams?:number;name:string;alias?:string;servingSize?:string;calories:number;protein:number;carbs:number;fat:number})[] = []): ParsedFoodResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      name: "Meal Entry",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: "unmatched",
    };
  }

  // 1. Try direct macro shorthand first
  const direct = tryParseDirectMacros(trimmed);
  if (direct) return direct;

  // 2. Parse natural language phrases
  // Split by connectors: "and", "with", "+", "&", ","
  const segments = favorites.some(f=>[f.name,f.alias].some(n=>n?.toLowerCase()===trimmed.toLowerCase())) ? [trimmed] : trimmed
    .split(/\band\b|\bwith\b|[+&,]/i)
    .map((s) => s.trim())
    .filter(Boolean);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  const detailParts:Extras[]=[];
  const matchedNames: string[] = [];

  for (const seg of segments) {
    const amount = /^(\d+(?:\.\d+)?)(?:\s*(oz|g|cups?|tbsp)\b)?\s*/i.exec(seg);
    const name = seg.slice(amount?.[0].length || 0).trim().toLowerCase();
    const saved = favorites.find(f=>[f.name,f.alias].some(n=>n?.toLowerCase()===name));
    const food = COMMON_FOODS.find(f => f.name.toLowerCase() === name || f.keywords.includes(name));
    const found = saved || food;
    if(found) {
      const serving=(saved?.grams && ["g","oz"].includes(amount?.[2]?.toLowerCase()||"") ? saved.grams+" g" : saved?.servingSize) || food?.defaultServing || '';
      let scale=amount ? Number(amount[1]) : 1;
      if(amount?.[2]) {
        const unit=amount[2].toLowerCase().replace(/cups?/, 'cup');
        const refs=Array.from(serving.matchAll(/(\d+(?:\.\d+)?(?:\/\d+)?)\s*(oz|g|cups?|tbsp)\b/gi));
        const ref=refs.find(m=>m[2].toLowerCase().replace(/cups?/,'cup')===unit) ||
          refs.find(m=>['oz','g'].includes(unit) && ['g','oz'].includes(m[2]));
        if(ref){const [n,d='1']=ref[1].split('/');scale/=Number(n)/Number(d);
          if(unit==='g' && ref[2]==='oz') scale/=28.3495;
          if(unit==='oz' && ref[2]==='g') scale*=28.3495;}
      }
      totalCalories+=Math.round(scale*(saved?.calories ?? food.caloriesPerUnit));
      totalProtein+=Math.round(scale*(saved?.protein ?? food.proteinPerUnit));
      totalCarbs+=Math.round(scale*(saved?.carbs ?? food.carbsPerUnit));
      totalFat+=Math.round(scale*(saved?.fat ?? food.fatPerUnit));
      detailParts.push(scaleExtras(saved || {},scale));
      matchedNames.push(found.name);
    }
    if (!found) {
      return {name: trimmed, calories: 0, protein: 0, carbs: 0, fat: 0, confidence: "unmatched"};
    }
  }

  const displayName =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  return {
    name: displayName,
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    ...Object.fromEntries(keys.filter(k=>detailParts.length && detailParts.every(p=>p[k]!=null)).map(k=>[k,detailParts.reduce((n,p)=>n+p[k]!,0)])),
    confidence: matchedNames.length > 0 ? "parsed_ingredients" : "unmatched",
    ingredients: matchedNames,
  };
}
