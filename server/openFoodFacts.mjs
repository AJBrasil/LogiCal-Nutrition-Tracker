import {execFile} from "node:child_process";
import {promisify} from "node:util";

const run = promisify(execFile);
const userAgent = "LogiCal/1.0 (https://github.com/AJBrasil/LogiCal-Nutrition-Tracker)";

async function macFetch(url) {
  // Apple's curl uses the Mac's native networking and certificate configuration.
  const {stdout} = await run("/usr/bin/curl", [
    "--silent", "--show-error", "--compressed", "--max-time", "20", "--connect-timeout", "6",
    "--user-agent", userAgent, "--header", "Accept: application/json",
    "--write-out", "\n%{http_code}", url.href
  ], {maxBuffer:8 * 1024 * 1024});
  const boundary = stdout.lastIndexOf("\n");
  return new Response(stdout.slice(0,boundary), {status:Number(stdout.slice(boundary+1))});
}

function failure(message, status, detail) {
  return Object.assign(Error(message), {status, detail});
}

// Only send submitted searches. Open Food Facts limits its public search API to 10 requests/minute.
export function createProductSearch(fetchProducts = fetch, recoverConnection = process.platform === "darwin" ? macFetch : null) {
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
      let response;
      try {
        response = await fetchProducts(url, {signal:AbortSignal.timeout(20000), headers:{
          "User-Agent":userAgent, Accept:"application/json"}});
      } catch (error) {
        const reason = error.cause?.code || error.name;
        // A timeout may already have consumed a search request. Only retry connection setup failures.
        if (recoverConnection && /^(ENOTFOUND|EAI_AGAIN|ENETUNREACH|ECONNREFUSED|EHOSTUNREACH|UND_ERR_CONNECT_TIMEOUT|CERT_|UNABLE_TO_|SELF_SIGNED)/.test(reason) && recentRequests.length < 10) {
          recentRequests.push(Date.now());
          try { response = await recoverConnection(url); }
          catch (nativeError) {throw failure("Your server could not connect to Open Food Facts. Saved and cached foods are still searchable.",502,reason + "/curl-" + nativeError.code);}
        } else {
          const timedOut = /timeout/i.test(reason);
          if (timedOut) response = new Response(null,{status:504});
          else throw failure("Your server could not connect to Open Food Facts. Saved and cached foods are still searchable.",502,reason);
        }
      }
      if ([500,502,503,504].includes(response.status) && recentRequests.length < 10) {
        // The text index is served independently of the legacy search application.
        const index = new URL("https://search.openfoodfacts.org/search");
        index.search = new URLSearchParams({q:term,page_size:"16",fields:"code,product_name,brands"});
        recentRequests.push(Date.now());
        const indexed = await fetchProducts(index, {signal:AbortSignal.timeout(12000),headers:{"User-Agent":userAgent}});
        if (indexed.ok) {
          const {hits} = await indexed.json();
          if (Array.isArray(hits)) {
            const foods = hits.filter(hit => /^\d{4,18}$/.test(hit?.code) && typeof hit.product_name === "string" && hit.product_name.trim())
              .map(hit => ({barcode:String(hit.code),name:[String((Array.isArray(hit.brands) ? hit.brands[0] : hit.brands) || "").replace(/^[a-z]{2}:/,""),hit.product_name].filter(Boolean).join(" "),
                source:"Open Food Facts",needsLabel:true}));
            if (cache.size >= 100) cache.delete(cache.keys().next().value);
            cache.set(term,{foods,time:Date.now()});
            return foods;
          }
        }
        response = indexed;
      }
      if (response.status === 429) throw failure("Open Food Facts is rate limiting searches. Try again in a minute.",429,"upstream-429");
      if (!response.ok) throw failure(`Open Food Facts returned HTTP ${response.status}. Saved and cached foods are still searchable.`,502,"upstream-" + response.status);
      let data;
      try {data = await response.json();} catch {throw failure("Open Food Facts returned an unreadable response. Try again shortly.",502,"invalid-json");}
      if (!Array.isArray(data?.products)) throw failure("Open Food Facts returned an unexpected product list.",502,"invalid-products");
      const products = data.products;
      const foods = products.map(labelFood).filter(Boolean);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(term,{foods,time:Date.now()});
      return foods;
    })();
    pending.set(term,request);
    try {return await request;} finally {pending.delete(term);}
  };
}

export function labelFood(product) {
  if (typeof product?.product_name !== "string" || !product.product_name.trim() || !product.code) return null;
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
    return {...extras, name:[typeof product.brands === "string" ? product.brands.split(",")[0].trim() : "",product.product_name.trim()].filter(Boolean).join(" "),
      barcode:String(product.code), servingSize:basis === "serving" ? product.serving_size : liquid ? "100 ml" : "100 g",
      ...(basis === "100g" && !liquid ? {grams:100} : {}), calories:Math.round(kcal), protein, carbs, fat, source:"Open Food Facts"};
  }
  return null;
}
