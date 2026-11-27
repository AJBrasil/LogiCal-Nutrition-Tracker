import defaultFavorites from "../src/app/services/defaultFavorites.json" with { type: "json" };
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS applied (id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS exports (meal TEXT PRIMARY KEY, ticket TEXT UNIQUE, state TEXT, payload TEXT);`);
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  transaction(() => {
    db.exec("CREATE TABLE IF NOT EXISTS setup (version INTEGER PRIMARY KEY)");
    if (db.prepare("INSERT OR IGNORE INTO setup VALUES (2)").run().changes) {
      const removePreset = db.prepare("DELETE FROM records WHERE key=? AND value=?");
      for (const item of defaultFavorites) {
        removePreset.run("favorite:" + item.id, JSON.stringify(item));
      }
    }
  });
  db.exec("CREATE TABLE IF NOT EXISTS product_cache (barcode TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const cacheProduct = db.prepare("INSERT OR REPLACE INTO product_cache VALUES (?, ?)");
  const search = db.prepare(`
    WITH foods(value, keywords, source, priority, recordKey) AS (
      SELECT value, coalesce(json_extract(value,'$.alias'), ''),
        CASE WHEN key GLOB 'favorite:*' THEN 'Saved food' ELSE 'Diary' END,
        CASE WHEN key GLOB 'favorite:*' THEN 1 ELSE 2 END, key
      FROM records WHERE key GLOB 'favorite:*' OR key GLOB 'meal:*'
      UNION ALL SELECT value, barcode, 'Open Food Facts', 3, barcode FROM product_cache
    ), matches AS (
      SELECT *, lower(json_extract(value,'$.name')) AS name FROM foods
      WHERE instr(lower(json_extract(value,'$.name')), ?) OR instr(lower(keywords), ?)
    ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY name ORDER BY priority, recordKey DESC) AS copy FROM matches
    ) SELECT value, source FROM ranked WHERE copy=1
      ORDER BY (name=? OR instr('|' || lower(keywords) || '|', '|' || ? || '|')>0) DESC, priority, name LIMIT 8`);
  return {
    db,
    cacheProducts(foods) {
      transaction(() => {for (const food of foods) cacheProduct.run(food.barcode, JSON.stringify(food));});
    },
    searchFoods(query) {
      const term = query.trim().toLowerCase();
      if (!term || term.length > 160) return [];
      return search.all(term, term, term, term).map(row => {
        const {id, createdAt, syncedToHealth, time, ...food} = JSON.parse(row.value);
        return {...food, source:row.source};
      });
    },
    read: () =>
      Object.fromEntries(
        db
          .prepare("SELECT * FROM records")
          .all()
          .map((r) => [r.key, JSON.parse(r.value)]),
      ),
    apply: (batch) =>
      transaction(() => {
        if (!Array.isArray(batch) || batch.length > 100)
          throw Error("Invalid batch");
        for (const { id, changes } of batch) {
          if (!/^[a-f0-9-]{36}$/i.test(id) || !Array.isArray(changes))
            throw Error("Invalid operation");
          if (
            !db.prepare("INSERT OR IGNORE INTO applied VALUES (?)").run(id)
              .changes
          )
            continue;
          for (const [key, value] of changes) {
            if (
              /^receipt:meal:\d{4}-\d\d-\d\d:\d+$/.test(key) &&
              ["pending", "confirmed"].includes(value)
            ) {
              db.prepare("INSERT OR IGNORE INTO exports VALUES (?,?,?,?)").run(
                key.slice(8),
                randomUUID(),
                value,
                "{}",
              );
              continue;
            }
            if (
              !/^(meal:\d{4}-\d\d-\d\d:\d+|favorite:\d+|goal:\d{4}-\d\d-\d\d|weight:\d{4}-\d\d-\d\d|water:\d{4}-\d\d-\d\d:[a-f0-9-]{36}|settings|onboarded)$/.test(
                key,
              )
            )
              throw Error("Invalid record");
            if (
              value !== null &&
              (key.startsWith("meal:") || key.startsWith("favorite:"))
            ) {
              if (
                typeof value.name !== "string" ||
                !value.name.trim() ||
                !Number.isSafeInteger(value.id) ||
                String(value.id) !== key.split(":").at(-1) ||
                !["morning", "afternoon", "evening"].includes(value.time) ||
                ["protein", "calories", "carbs", "fat"].some(
                  (k) => !Number.isFinite(value[k]) || value[k] < 0,
                )
              )
                throw Error("Invalid meal");
            }
            if (
              value !== null &&
              key.startsWith("goal:") &&
              ["calories", "protein", "fat", "carbs"].some(
                (k) => !Number.isFinite(value[k]) || value[k] < 0,
              )
            )
              throw Error("Invalid goal");
            if(value!==null && /^(water|weight):/.test(key) && (!Number.isFinite(value)||value<=0)) throw Error("Invalid measurement");
            if (value === null)
              db.prepare("DELETE FROM records WHERE key=?").run(key);
            else
              db.prepare("INSERT OR REPLACE INTO records VALUES (?,?)").run(
                key,
                JSON.stringify(value),
              );
          }
        }
      }),
    status: () =>
      Object.fromEntries(
        db
          .prepare("SELECT meal,state FROM exports")
          .all()
          .map((r) => [r.meal, r.state]),
      ),
    reserve: (meal, timestamp) =>
      transaction(() => {
        if (!/^meal:/.test(meal) || !Number.isFinite(Date.parse(timestamp)))
          throw Error("Invalid meal");
        const row = db
          .prepare("SELECT value FROM records WHERE key=?")
          .get(meal);
        if (!row) throw Error("Meal unavailable");
        if (db.prepare("SELECT 1 FROM exports WHERE meal=?").get(meal))
          throw Error("Already exported or awaiting confirmation");
        const food = JSON.parse(row.value);
        const ticket = randomUUID();
        const payload = {
          ticket,
          date: timestamp,
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        };
        db.prepare("INSERT INTO exports VALUES (?,?,'pending',?)").run(
          meal,
          ticket,
          JSON.stringify(payload),
        );
        return payload;
      }),
    confirm: (ticket) => {
      if (
        !db
          .prepare("UPDATE exports SET state='confirmed' WHERE ticket=?")
          .run(ticket).changes
      )
        throw Error("Unknown ticket");
    },
    reconcile: (meal, written) => {
      if (written)
        db.prepare(
          "UPDATE exports SET state='confirmed' WHERE meal=? AND state='pending'",
        ).run(meal);
      else
        db.prepare("DELETE FROM exports WHERE meal=? AND state='pending'").run(
          meal,
        );
    },
  };
}
