// Only send submitted searches. Open Food Facts limits its public search API to 10 requests/minute.
export function createProductSearch(fetchProducts = fetch) {
  const recentRequests = [];
  const cache = new Map();
  const pending = new Map();
  return async function searchProducts(query) {
    const term = query.trim().toLowerCase();
    if (!term || term.length > 160) throw Object.assign(Error("Enter a food or brand name."), {status:400});
    const now = Date.now();
    const cached = cache.get(term);
    if (cached && now - cached.time < 3600000) return cached.foods;
    if (pending.has(term)) return pending.get(term);
    while (recentRequests.length && recentRequests[0] <= now - 60000) recentRequests.shift();
    if (recentRequests.length >= 10) throw Object.assign(Error("Search limit reached. Try again in a minute."), {status:429});
    recentRequests.push(now);
    const request = (async () => {
      const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
      url.search = new URLSearchParams({action:"process", search_terms:term, search_simple:"1", json:"1", page_size:"24",
        fields:"code,product_name,brands,serving_size,nutriments,nutrition_data_per"});
      const response = await fetchProducts(url, {signal:AbortSignal.timeout(12000), headers:{
        "User-Agent":"LogiCal/1.0 (https://github.com/AJBrasil/LogiCal-Nutrition-Tracker)", Accept:"application/json"}});
      if (response.status === 429) throw Object.assign(Error("Open Food Facts is rate limiting searches. Try again in a minute."), {status:429});
      if (!response.ok) throw Error("Product search unavailable");
      const {products} = await response.json();
      if (!Array.isArray(products)) throw Error("Invalid product search response");
      const foods = products.map(labelFood).filter(Boolean);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(term,{foods,time:Date.now()});
      return foods;
    })();
    pending.set(term,request);
    try {return await request;} finally {pending.delete(term);}
  };
}

function labelFood(product) {
  if (!product?.product_name?.trim() || !product.code) return null;
  const nutrition = product.nutriments || {};
  // Use a single label basis for the entire row. Keep incomplete labels out of macro totals.
  for (const basis of ["serving","100g"]) {
    if (basis === "serving" && !product.serving_size) continue;
    function value(key) {
      const raw = nutrition[key + "_" + basis];
      if (typeof raw !== "number" && (typeof raw !== "string" || !raw.trim())) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    }
    const kcal = value("energy-kcal") ?? (value("energy-kj") ?? value("energy")) / 4.184;
    const protein = value("proteins"), carbs = value("carbohydrates"), fat = value("fat");
    if (!Number.isFinite(kcal) || [protein,carbs,fat].includes(undefined)) continue;
    const extras = {};
    for (const [field,key] of [["fiber","fiber"],["sugar","sugars"],["sodium","sodium"],["saturatedFat","saturated-fat"]]) {
      const n = value(key);
      if (n !== undefined) extras[field] = field === "sodium" ? Math.round(n*1000) : n;
    }
    const liquid = product.nutrition_data_per === "100ml";
    return {...extras, name:[product.brands?.split(",")[0].trim(),product.product_name.trim()].filter(Boolean).join(" "),
      barcode:String(product.code), servingSize:basis === "serving" ? product.serving_size : liquid ? "100 ml" : "100 g",
      ...(basis === "100g" && !liquid ? {grams:100} : {}), calories:Math.round(kcal), protein, carbs, fat, source:"Open Food Facts"};
  }
  return null;
}
