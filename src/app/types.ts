import type { MealPeriod } from "./services/storageService";

import type {Extras} from "./services/nutrients";
export type Screen = "foods" | "dashboard" | "goals" | "analytics";

export interface ModalMacros extends Extras {
  barcode?:string;
  grams?:number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alias?: string;
  servingSize?: string;
  time: MealPeriod;
}
