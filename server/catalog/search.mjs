import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {readFileSync} from "node:fs";

let queryFoods;
function loadCatalog() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE VIRTUAL TABLE foods USING fts5(name, data UNINDEXED, tokenize='porter unicode61')");
  const insert = db.prepare("INSERT INTO foods(name,data) VALUES (?,?)");
  const foods = JSON.parse(gunzipSync(readFileSync(new URL("./everyday-foods.json.gz",import.meta.url))));
  db.exec("BEGIN");
  for (const food of foods) insert.run(food.name, JSON.stringify(food));
  db.exec("COMMIT");
  return db.prepare(`SELECT data FROM foods WHERE foods MATCH ?
    ORDER BY lower(name) = ? DESC, lower(name) LIKE ? DESC,
      lower(name) LIKE '%no added fat' DESC, rank, length(name), rowid LIMIT 24`);
}

export function everydayFoods(text) {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!tokens || text.length > 160 || tokens.join("").length < 2) return [];
  queryFoods ??= loadCatalog();
  const terms = tokens.map(t => '"' + t + '"*').join(" AND ");
  const primary = tokens[0].replace(/s$/,"") + ",%";
  const seen = new Set();
  return queryFoods.all(terms,text.trim().toLowerCase(),primary).map(row => ({
    ...JSON.parse(row.data), source:"USDA", grams:100, servingSize:"100 g"
  })).filter(food => {
    const name = food.name.toLowerCase();
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  }).slice(0,8);
}
