export interface ScannedProduct {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  servingWeightGrams?: number;
  imageUrl?: string;
  source: "openfoodfacts" | "local_database";
  confidence: "high" | "medium" | "fallback";
}

export interface ScaledBarcodeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  servingWeightGrams?: number;
}

export interface DemoBarcode {
  barcode: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  category: string;
  imageUrl?: string;
}

export const DEMO_BARCODES: DemoBarcode[] = [
  {
    barcode: "0888849000043",
    name: "Chocolate Chip Cookie Dough Protein Bar",
    brand: "Quest Nutrition",
    calories: 200,
    protein: 21,
    carbs: 22,
    fat: 7,
    servingSize: "1 bar (60g)",
    category: "Protein Snack",
    imageUrl: "https://images.openfoodfacts.org/images/products/088/884/900/0043/front_en.11.200.jpg",
  },
  {
    barcode: "5201051000854",
    name: "Total 2% Plain Greek Strained Yogurt",
    brand: "FAGE",
    calories: 140,
    protein: 17,
    carbs: 6,
    fat: 4,
    servingSize: "1 cup (170g)",
    category: "Dairy",
    imageUrl: "https://images.openfoodfacts.org/images/products/520/105/100/0854/front_en.35.200.jpg",
  },
  {
    barcode: "0811620021616",
    name: "2% Reduced Fat Ultra-Filtered Milk",
    brand: "Fairlife",
    calories: 120,
    protein: 13,
    carbs: 6,
    fat: 5,
    servingSize: "1 cup (240ml)",
    category: "Beverage",
    imageUrl: "https://images.openfoodfacts.org/images/products/081/162/002/1616/front_en.21.200.jpg",
  },
  {
    barcode: "0030000010404",
    name: "Old Fashioned Rolled Oats 100% Whole Grain",
    brand: "Quaker",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    servingSize: "1/2 cup dry (40g)",
    category: "Grains",
    imageUrl: "https://images.openfoodfacts.org/images/products/003/000/001/0404/front_en.16.200.jpg",
  },
  {
    barcode: "0096619223308",
    name: "Wild Albacore Tuna in Water",
    brand: "Kirkland Signature",
    calories: 130,
    protein: 30,
    carbs: 0,
    fat: 1,
    servingSize: "1 can drained (140g)",
    category: "Seafood",
  },
  {
    barcode: "0049000042566",
    name: "Zero Sugar Soda",
    brand: "Coca-Cola",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: "1 can (355ml)",
    category: "Beverage",
  },
];

const BARCODE_CACHE_KEY = "logical_barcode_product_cache";

function numberOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseServingWeightGrams(value: unknown): number | undefined {
  const n = numberOrZero(value);
  return n > 0 ? n : undefined;
}

function servingValue(nutriments: Record<string, unknown>, servingKey: string, hundredGramKey: string, baseKey: string, servingWeightGrams?: number): number {
  const serving = numberOrZero(nutriments[servingKey]);
  if (serving > 0) return serving;

  const hundredGram = numberOrZero(nutriments[hundredGramKey]);
  if (hundredGram > 0 && servingWeightGrams) {
    return (hundredGram * servingWeightGrams) / 100;
  }

  return hundredGram || numberOrZero(nutriments[baseKey]);
}

export function clampServingMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(value, 0.05), 20);
}

export function multiplierFromServingGrams(product: ScannedProduct, grams: number): number {
  if (!product.servingWeightGrams || product.servingWeightGrams <= 0) return 1;
  return clampServingMultiplier(grams / product.servingWeightGrams);
}

export function scaleBarcodeNutrition(product: ScannedProduct, multiplier: number): ScaledBarcodeNutrition {
  const safeMultiplier = clampServingMultiplier(multiplier);
  const servingWeightGrams = product.servingWeightGrams
    ? Math.round(product.servingWeightGrams * safeMultiplier)
    : undefined;

  return {
    calories: Math.round(product.calories * safeMultiplier),
    protein: Math.round(product.protein * safeMultiplier),
    carbs: Math.round(product.carbs * safeMultiplier),
    fat: Math.round(product.fat * safeMultiplier),
    servingSize: safeMultiplier === 1 ? product.servingSize : `${safeMultiplier}x ${product.servingSize}`,
    servingWeightGrams,
  };
}

function isConfidence(value: unknown): value is ScannedProduct["confidence"] {
  return value === "high" || value === "medium" || value === "fallback";
}

function normalizeCachedProduct(value: unknown): ScannedProduct | null {
  if (!value || typeof value !== "object") return null;
  const product = value as Partial<ScannedProduct>;
  if (
    typeof product.barcode !== "string" ||
    typeof product.name !== "string" ||
    typeof product.servingSize !== "string" ||
    !isConfidence(product.confidence)
  ) {
    return null;
  }

  return {
    barcode: product.barcode,
    name: product.name,
    brand: typeof product.brand === "string" ? product.brand : undefined,
    calories: numberOrZero(product.calories),
    protein: numberOrZero(product.protein),
    carbs: numberOrZero(product.carbs),
    fat: numberOrZero(product.fat),
    servingSize: product.servingSize,
    servingWeightGrams: parseServingWeightGrams(product.servingWeightGrams),
    imageUrl: typeof product.imageUrl === "string" ? product.imageUrl : undefined,
    source: product.source === "openfoodfacts" ? "openfoodfacts" : "local_database",
    confidence: product.confidence,
  };
}

function getCachedBarcodeMap(): Record<string, ScannedProduct> {
  if (typeof localStorage === "undefined") return {};

  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, ScannedProduct>>(
      (acc, [barcode, product]) => {
        const normalized = normalizeCachedProduct(product);
        if (normalized) {
          acc[barcode] = normalized;
        }
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
}

export function getCachedBarcodeProduct(barcode: string): ScannedProduct | null {
  const cleanCode = barcode.trim().replace(/[^0-9]/g, "");
  return getCachedBarcodeMap()[cleanCode] ?? null;
}

export function cacheBarcodeProduct(product: ScannedProduct): void {
  if (typeof localStorage === "undefined" || product.confidence === "fallback") return;

  try {
    const cache = getCachedBarcodeMap();
    cache[product.barcode] = product;
    localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn("Failed to cache barcode product", err);
  }
}

/**
 * Fetch product nutritional info by barcode using the Open Food Facts API
 * with instant fallback to demo data if offline or unavailable.
 */
export async function lookupBarcode(barcode: string): Promise<ScannedProduct> {
  const cleanCode = barcode.trim().replace(/[^0-9]/g, "");

  // Check local demo cache first
  const localMatch = DEMO_BARCODES.find((d) => d.barcode === cleanCode);
  const cachedMatch = getCachedBarcodeProduct(cleanCode);
  if (cachedMatch) {
    return cachedMatch;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LogiCalNutritionTracker - Web/iOS - version 1.0",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const n = p.nutriments || {};
        const servingWeightGrams = parseServingWeightGrams(p.serving_quantity);

        // Calculate calories per serving or per 100g
        const calories = Math.round(
          servingValue(n, "energy-kcal_serving", "energy-kcal_100g", "energy-kcal", servingWeightGrams) ||
          (numberOrZero(n["energy_serving"]) ? numberOrZero(n["energy_serving"]) / 4.184 : 0)
        );

        const protein = Math.round(
          servingValue(n, "proteins_serving", "proteins_100g", "proteins", servingWeightGrams)
        );

        const carbs = Math.round(
          servingValue(n, "carbohydrates_serving", "carbohydrates_100g", "carbohydrates", servingWeightGrams)
        );

        const fat = Math.round(
          servingValue(n, "fat_serving", "fat_100g", "fat", servingWeightGrams)
        );

        const hasServingMacros = Boolean(
          n["energy-kcal_serving"] ||
          n["proteins_serving"] ||
          n["carbohydrates_serving"] ||
          n["fat_serving"]
        );
        const servingSize = p.serving_size || p.quantity || "1 serving";
        const name = p.product_name || p.generic_name || `Scanned Item #${cleanCode}`;
        const brand = p.brands ? p.brands.split(",")[0].trim() : undefined;
        const imageUrl = p.image_front_url || p.image_small_url || localMatch?.imageUrl;

        const product: ScannedProduct = {
          barcode: cleanCode,
          name: brand ? `${brand} ${name}` : name,
          brand,
          calories,
          protein,
          carbs,
          fat,
          servingSize,
          servingWeightGrams,
          imageUrl,
          source: "openfoodfacts",
          confidence: hasServingMacros ? "high" : "medium",
        };
        cacheBarcodeProduct(product);
        return product;
      }
    }
  } catch (err) {
    console.warn("Open Food Facts API fetch failed or timed out, checking local presets", err);
  }

  // Fallback to local match if found
  if (localMatch) {
    const product: ScannedProduct = {
      barcode: localMatch.barcode,
      name: `${localMatch.brand} ${localMatch.name}`,
      brand: localMatch.brand,
      calories: localMatch.calories,
      protein: localMatch.protein,
      carbs: localMatch.carbs,
      fat: localMatch.fat,
      servingSize: localMatch.servingSize,
      imageUrl: localMatch.imageUrl,
      source: "local_database",
      confidence: "medium",
    };
    cacheBarcodeProduct(product);
    return product;
  }

  // Fallback if not found in API or local presets
  return {
    barcode: cleanCode,
    name: `Food Item (${cleanCode})`,
    calories: 150,
    protein: 10,
    carbs: 15,
    fat: 5,
    servingSize: "1 serving",
    source: "local_database",
    confidence: "fallback",
  };
}

/**
 * Check if browser supports native BarcodeDetector API
 */
export function hasBarcodeDetectorSupport(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * Scan video element with native BarcodeDetector if available
 */
export async function scanVideoFrameWithBarcodeDetector(video: HTMLVideoElement): Promise<string | null> {
  if (!hasBarcodeDetectorSupport()) return null;
  try {
    // @ts-expect-error - BarcodeDetector is a modern web standard
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
    });
    const barcodes = await detector.detect(video);
    if (barcodes && barcodes.length > 0) {
      return barcodes[0].rawValue;
    }
  } catch (err) {
    console.debug("BarcodeDetector frame detection:", err);
  }
  return null;
}
