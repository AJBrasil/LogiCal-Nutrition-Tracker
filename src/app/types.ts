import type { MealPeriod } from "./services/storageService";

export type Screen = "dashboard" | "goals" | "analytics";

export interface ModalMacros {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alias?: string;
  servingSize?: string;
  time: MealPeriod;
}
