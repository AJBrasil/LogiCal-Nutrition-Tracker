import { useState } from "react";
import { toast } from "sonner";
import {
  exportAllUserDataJSON,
  importUserDataJSON,
  type FoodEntry,
} from "../services/storageService";
import { exportAppleHealthCSV } from "../services/appleHealthService";
import {
  healthExports,lastBackup,records,
  post,
  refresh,
  syncLabel,
} from "../services/serverSync";

export default function ServerSettings({
  date,
  entries,
  close,
  setup,
}: {
  date: string;
  entries: FoodEntry[];
  close: () => void;
  setup: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState(false);
  async function exportMeal(entry: FoodEntry) {
    setWorking(true);
    try {
      const meal = "meal:" + date + ":" + entry.id;
      const created = entry.createdAt ? new Date(entry.createdAt) : null;
      const time = created
        ? created.toTimeString().slice(0, 8)
        : { morning: "08:00:00", afternoon: "13:00:00", evening: "19:00:00" }[
            entry.time
          ];
      const payload = await post("export", {
        meal,
        date: entry.createdAt || new Date(date + "T" + time).toISOString(),
      });
      payload.confirmURL = new URL("/api/confirm", location.href).href;
      await refresh();
      location.href =
        "shortcuts://run-shortcut?name=LogiCal%20Meal&input=text&text=" +
        encodeURIComponent(JSON.stringify(payload));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setWorking(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([exportAllUserDataJSON()], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "LogiCal-" + date + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function resolve(meal: string, written: boolean) {
    if (
      !confirm(
        written
          ? "Confirm that all four values were written in Health?"
          : "Have you checked Health and removed any partially written samples before retrying?",
      )
    )
      return;
    try {
      await post("reconcile", { meal, written });
      await refresh();
    } catch (e) {
      toast.error(String(e));
    }
  }
  return (
    <section className="absolute inset-0 z-50 bg-background text-foreground p-5 overflow-y-auto space-y-4">
      <header className="flex justify-between">
        <h2>Settings</h2>
        <button onClick={close}>Done</button>
      </header>
      <section className="nutrition-panel"><h3>Server status</h3><p>Connection · {syncLabel()}</p>
        <p>Last verified database backup · {lastBackup?new Date(lastBackup).toLocaleString():"No successful backup reported"}</p>
        <h3>Pending Apple Health exports</h3>{Object.values(healthExports).every(s=>s!=="pending") && <p>None pending</p>}
        {Object.entries(healthExports).filter(([,s])=>s==="pending").map(([key])=><div key={key}><p>{key.split(":")[1]} · {records()[key]?.name || "Deleted meal"}</p><div className="nutrition-actions"><button onClick={()=>resolve(key,true)}>Mark written</button><button onClick={()=>resolve(key,false)}>Release for retry</button></div></div>)}
      </section>
      <button onClick={setup}>Run goal setup</button>
      <h3>Data</h3>
      <div className="grid gap-3">
        <button onClick={backup}>Download JSON backup</button>
        <label>
          Import LogiCal backup{" "}
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (
                f &&
                confirm(
                  "Merge this backup? Matching entry IDs and target dates will be updated.",
                )
              )
                toast(
                  importUserDataJSON(await f.text())
                    ? "Backup queued for saving"
                    : "Invalid backup file",
                );
            }}
          />
        </label>
        <button onClick={() => exportAppleHealthCSV(entries, date)}>
          Export daily CSV
        </button>
      </div>
      <h3>Apple Health</h3>
      <button onClick={() => setPreview(!preview)}>
        Preview meal exports for {date}
      </button>
      {preview && (
        <>
          <p>
            Set up the LogiCal Meal shortcut on your iPhone. Review each meal
            before exporting.
          </p>
          <details>
            <summary>iPhone Shortcut setup</summary>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Create a shortcut named LogiCal Meal. Use Get Dictionary from
                Input on Shortcut Input.
              </li>
              <li>
                Read date from the dictionary and use Get Dates from Input. For
                each meal value, use Log Health Sample with that date. Map
                calories to Dietary Energy (kcal), protein to Protein (g), carbs
                to Carbohydrates (g), and fat to Total Fat (g).
              </li>
              <li>
                After all four writes, use Get Contents of URL to POST to{" "}
                {location.origin}/api/confirm. Use a JSON body with the text
                field ticket set to the dictionary’s ticket value.
              </li>
            </ol>
          </details>
          {!entries.length && <p>No meals on this date.</p>}
          {entries.map((e) => {
            const key = "meal:" + date + ":" + e.id;
            const status = healthExports[key];
            return (
              <article key={key} className="py-2 border-b border-border">
                <strong>{e.name}</strong>
                <p>
                  {e.calories} kcal · {e.protein}g protein · {e.carbs}g carbs ·{" "}
                  {e.fat}g fat
                </p>
                {status === "confirmed" ? (
                  <span>Export confirmed</span>
                ) : status === "pending" ? (
                  <>
                    <span>Awaiting confirmation · Check Health</span>
                    <div>
                      <button onClick={() => resolve(key, true)}>
                        Mark written
                      </button>{" "}
                      ·{" "}
                      <button onClick={() => resolve(key, false)}>
                        Release for retry
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    disabled={working || syncLabel() !== "Saved"}
                    onClick={() => exportMeal(e)}
                  >
                    Export meal to Apple Health
                  </button>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
