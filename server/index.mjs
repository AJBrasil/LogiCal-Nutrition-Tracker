import {createProductSearch, labelFood} from "./openFoodFacts.mjs";
import http from "node:http";
import { mkdirSync, readFileSync, existsSync, createReadStream, statSync } from "node:fs";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { openStore } from "./store.mjs";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const path =
  process.env.LOGICAL_DB ||
  resolve(homedir(), "Library/Application Support/LogiCal/nutrition.sqlite");
mkdirSync(dirname(path), { recursive: true });
const store = openStore(path);
const searchProducts = createProductSearch();
function snapshot(){
  let lastBackup=null;
  try{lastBackup=readFileSync(path+".backup-status","utf8").trim();}catch(e){if(e.code!=="ENOENT")throw e;}
  return {records:store.read(),exports:store.status(),lastBackup};
}
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const port = Number(process.env.PORT || 4317);
http
  .createServer(async (req, res) => {
    function json(status, value) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    }
    try {
      const url = new URL(req.url, "http://localhost");
      const validHost = [
        `localhost:${port}`,
        `127.0.0.1:${port}`,
        process.env.LOGICAL_HOST,
      ].filter(Boolean);
      if (!validHost.includes(req.headers.host) && !process.env.LOGICAL_OWNER)
        return json(403, { error: "Use the configured host" });
      if (
        process.env.LOGICAL_OWNER &&
        req.headers["tailscale-user-login"] !== process.env.LOGICAL_OWNER
      )
        return json(403, { error: "Use your authorized Tailscale identity" });
      if (url.pathname.startsWith("/api/")) {
        if (req.method === "GET" && url.pathname === "/api/foods/label") {
          const code = url.searchParams.get("code") || "";
          if (!/^\d{4,18}$/.test(code)) return json(400,{error:"Invalid product code"});
          try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,brands,serving_size,nutriments,nutrition_data_per`,
              {signal:AbortSignal.timeout(12000),headers:{"User-Agent":"LogiCal/1.0 (https://github.com/AJBrasil/LogiCal-Nutrition-Tracker)"}});
            if (!response.ok) return json(response.status === 429 ? 429 : 502,{error:"Nutrition label unavailable"});
            const food = labelFood((await response.json()).product);
            if (!food) return json(404,{error:"No complete nutrition label"});
            try {store.cacheProducts([food]);} catch (error) {console.warn("Product cache write failed", error.code);}
            return json(200,food);
          } catch {return json(502,{error:"Nutrition label unavailable"});}
        }
        if (req.method === "GET" && url.pathname === "/api/foods/products") {
          try {
            const foods = await searchProducts(url.searchParams.get("q") || "");
            try {
              store.cacheProducts(foods.filter(food => !food.needsLabel));
            } catch (error) {
              console.warn("Product cache write failed code=%s",error.code || error.name);
            }
            console.info("GET /api/foods/products openfoodfacts matches=%d", foods.length);
            return json(200, foods);
          } catch (error) {
            const status = error.status || 502;
            console.warn("GET /api/foods/products status=%d reason=%s",status,error.detail || error.code || error.name);
            return json(status, {error:error.status ? error.message : "Open Food Facts is unavailable. Try again shortly."});
          }
        }
        if (req.method === "GET" && url.pathname === "/api/foods/search") {
          const start = performance.now();
          const matches = store.searchFoods(url.searchParams.get("q") || "");
          console.info("GET /api/foods/search sqlite matches=%d duration_ms=%d", matches.length, Math.round(performance.now()-start));
          return json(200, matches);
        }
        if (req.method === "GET" && url.pathname === "/api/state")
          return json(200, snapshot());
        if (
          req.method !== "POST" ||
          req.headers["content-type"]?.split(";")[0] !== "application/json"
        )
          return json(415, { error: "JSON required" });
        if (
          req.headers.origin &&
          new URL(req.headers.origin).host !== req.headers.host &&
          new URL(req.headers.origin).host !== process.env.LOGICAL_HOST
        )
          return json(403, { error: "Origin mismatch" });
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 16 * 1024 * 1024)
            return json(413, { error: "Request too large" });
          chunks.push(chunk);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString());
        switch (url.pathname) {
          case "/api/sync":
            store.apply(body);
            return json(200,snapshot());
          case "/api/export":
            return json(200, store.reserve(body.meal, body.date));
          case "/api/confirm":
            store.confirm(body.ticket);
            break;
          case "/api/reconcile":
            store.reconcile(body.meal, body.written === true);
            break;
          default:
            return json(404, { error: "Unknown endpoint" });
        }
        return json(200, { ok: true });
      }
      const file = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (
        req.method !== "GET" ||
        !file.startsWith(resolve(root) + sep) ||
        !existsSync(file) ||
        !statSync(file).isFile()
      )
        return json(404, { error: "Missing file" });
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
      });
      createReadStream(file).pipe(res);
    } catch (error) {
      json(400, { error: String(error.message) });
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("LogiCal listening on localhost port", port),
  );
