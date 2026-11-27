import { DatabaseSync, backup } from "node:sqlite";
import { statSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
const source =
  process.env.LOGICAL_DB ||
  resolve(homedir(), "Library/Application Support/LogiCal/nutrition.sqlite");
const target = process.argv[2];
if (!target || !statSync(target).isDirectory())
  throw Error("Supply a mounted backup directory");
if (
  statSync(source).dev === statSync(target).dev &&
  !process.env.LOGICAL_TEST_BACKUP
)
  throw Error("Use a separate backup volume");
const db = new DatabaseSync(source, { readOnly: true });
const output = resolve(
  target,
  "LogiCal-" + new Date().toISOString().slice(0, 10) + ".sqlite",
);
const tmp = output + "." + process.pid + ".partial";
try {
  await backup(db, tmp);
  const restored = new DatabaseSync(tmp, { readOnly: true });
  try {
    if (
      restored.prepare("PRAGMA integrity_check").get().integrity_check !== "ok"
    )
      throw Error("Backup verification failed");
  } finally {
    restored.close();
  }
  renameSync(tmp, output);
  const status=source+".backup-status";
  writeFileSync(status+"."+process.pid,new Date().toISOString());
  renameSync(status+"."+process.pid,status);
} finally {
  db.close();
  rmSync(tmp, { force: true });
}
