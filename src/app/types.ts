import type { MealPeriod } from "./services/storageService";

import type {Extras} from "./services/nutrients";
export type Screen = "foods" | "dashboard" | "goals" | "analytics";

import type {PortionInfo} from "./services/portions";
export interface ModalMacros extends Extras, PortionInfo {
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
