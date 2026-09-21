export type FitnessPhase = "cut" | "recomp" | "bulk";

/**
 * Clamps a numerical value within [min, max]
 */
export function clamp(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * Computes total calories from macronutrients:
 * Protein: 4 kcal/g
 * Carbohydrates: 4 kcal/g
 * Fat: 9 kcal/g
 */
export function calculateMacroCalories(
  protein: number,
  carbs: number,
  fat: number
): number {
  const p = Math.max(0, Number(protein) || 0);
  const c = Math.max(0, Number(carbs) || 0);
  const f = Math.max(0, Number(fat) || 0);
  return p * 4 + c * 4 + f * 9;
}

/**
 * Calculates daily base target calories according to phase and weekly goal rate:
 * - Cut: maintenance - (weeklyRate * 500 kcal/day)
 * - Recomp: maintenance
 * - Bulk: maintenance + (weeklyRate * 250 kcal/day)
 */
export function calculateBasePhaseCalories(
  phase: FitnessPhase,
  weeklyRate: number,
  maintenanceBaseline: number = 2800
): number {
  const rate = Math.max(0, Number(weeklyRate) || 0);
  switch (phase) {
    case "cut":
      return Math.round(maintenanceBaseline - rate * 500);
    case "recomp":
      return Math.round(maintenanceBaseline);
    case "bulk":
      return Math.round(maintenanceBaseline + rate * 250);
    default:
      return maintenanceBaseline;
  }
}

/**
 * Computes progress percentage towards a target macro/calorie goal clamped to [0, 100]
 */
export function calculateMacroTargetRatio(current: number, target: number): number {
  if (!target || target <= 0) return 0;
  const pct = (Math.max(0, current) / target) * 100;
  return clamp(pct, 0, 100);
}

/**
 * Determines whether a logged value is within target tolerance (default +/- 10%)
 */
export function isOnTarget(
  val: number,
  target: number,
  toleranceRatio: number = 0.1
): boolean {
  if (val <= 0 || !target || target <= 0) return false;
  return Math.abs(val - target) / target <= toleranceRatio;
}

/**
 * Computes the arithmetic mean of an array of numbers, rounded to the nearest integer
 */
export function calculateAverage(values: number[]): number {
  if (!values.length) return 0;
  const valid = values.filter((v) => !isNaN(v));
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / valid.length);
}

/**
 * Computes average percentage fluctuation around the mean for active logged values
 */
export function calculateFluctuation(values: number[]): number {
  const valid = values.filter((v) => Number(v) > 0);
  if (!valid.length) return 0;

  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (mean === 0) return 0;

  const pctDiffs = valid.map((v) => Math.abs((v - mean) / mean) * 100);
  return Math.round(pctDiffs.reduce((a, b) => a + b, 0) / pctDiffs.length);
}

/**
 * Calculates remaining protein target to balance total calories when carbs or fat are adjusted
 */
export function calculateBalancedProtein(
  targetCalories: number,
  carbs: number,
  fat: number,
  minProtein: number = 100,
  maxProtein: number = 350
): number {
  const remainingCals = targetCalories - carbs * 4 - fat * 9;
  const proteinGrams = Math.round(remainingCals / 4);
  return clamp(proteinGrams, minProtein, maxProtein);
}

