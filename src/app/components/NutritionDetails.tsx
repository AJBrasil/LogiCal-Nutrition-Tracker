import { useState } from "react";
import { toast } from "sonner";
import {
  keys,
  nutrients,
  unit,
  type Extras,
  type Nutrient,
} from "../services/nutrients";
import { change, records } from "../services/serverSync";
import {
  formatDateKey,
  getDailyTotals,
  getEntriesForDate,
  getTargets,
  type FoodEntry,
  type Targets,
} from "../services/storageService";

export function ExtraFields({
  value,
  onChange,
}: {
  value: Extras;
  onChange: (next: Extras) => void;
}) {
  return (
    <div className="nutrition-fields">
      {keys.map((k) => (
        <label key={k}>
          {nutrients[k]} ({unit(k)})
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Unknown"
            value={value[k] ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                [k]:
                  e.target.value === ""
                    ? undefined
                    : Math.max(0, Number(e.target.value)),
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
export function OptionalGoals({
  options,
  visible,
  setOptions,
  setVisible,
}: {
  options: Targets["optional"];
  visible: (Nutrient | "water")[];
  setOptions: (v: Targets["optional"]) => void;
  setVisible: (v: (Nutrient | "water")[]) => void;
}) {
  return (
    <section className="nutrition-panel">
      <h3>Daily tracking</h3>
      <div className="nutrition-fields">
        {(["water", ...keys] as const).map((k) => (
          <div key={k}>
            <label>
              <input
                type="checkbox"
                checked={visible.includes(k)}
                onChange={(e) =>
                  setVisible(
                    e.target.checked
                      ? [...visible, k]
                      : visible.filter((x) => x !== k),
                  )
                }
              />{" "}
              Show {k === "water" ? "water" : nutrients[k].toLowerCase()}
            </label>
            <label>
              Daily target ({k === "water" ? "mL" : unit(k)})
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
                value={options?.[k] ?? ""}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    [k]:
                      e.target.value === ""
                        ? undefined
                        : Math.max(0, Number(e.target.value)),
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
export function DiaryDetails({
  date,
  entries,
  targets,
}: {
  date: string;
  entries: FoodEntry[];
  targets: Targets;
}) {
  const visible = targets.visible ?? ["water"];
  const [amount, setAmount] = useState(250);
  const drinks = Object.entries(records()).filter(([k]) =>
    k.startsWith("water:" + date + ":"),
  );
  if (!visible.length) return null;
  return (
    <section className="nutrition-panel">
      <h3>Daily tracking</h3>
      {visible.includes("water") && (
        <div>
          <strong>
            Water · {drinks.reduce((s, [, v]) => s + Number(v), 0)} mL
          </strong>
          {targets.optional?.water != null &&
            " / " + targets.optional.water + " mL"}
          <div className="nutrition-actions">
            <input
              type="number"
              aria-label="Water in milliliters"
              min="1"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button
              disabled={amount <= 0}
              onClick={() => {
                const k = "water:" + date + ":" + crypto.randomUUID();
                change([[k, amount]]);
                toast("Water logged", {
                  action: { label: "Undo", onClick: () => change([[k, null]]) },
                });
              }}
            >
              + Water
            </button>
          </div>
        </div>
      )}
      {keys
        .filter((k) => visible.includes(k))
        .map((k) => {
          const known = entries.filter((e) => e[k] != null);
          return (
            <p key={k}>
              {nutrients[k]} ·{" "}
              {known.length
                ? Number(known.reduce((v, e) => v + e[k]!, 0).toFixed(2)) +
                  " " +
                  unit(k)
                : "Unknown"}
              {targets.optional?.[k] != null
                ? " / " + targets.optional[k] + " " + unit(k)
                : ""}
              {known.length > 0 && known.length < entries.length
                ? " (partial)"
                : ""}
            </p>
          );
        })}
    </section>
  );
}
function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}
export function WeightProgress({ days }: { days: number }) {
  const today = formatDateKey();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const weights = Object.entries(records())
    .filter(([k]) => k.startsWith("weight:"))
    .map(([k, v]) => ({ date: k.slice(7), weight: Number(v) }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
    const dates = Array.from({ length: Math.min(7, days - i * 7) }, (_, j) =>
      shiftDate(today, -i * 7 - j),
    );
    const actual = { calories: 0, protein: 0, carbs: 0, fat: 0 },
      target = { ...actual };
    let logged = 0;
    for (const d of dates) {
      const meals = getEntriesForDate(d);
      if (!meals.length) continue;
      const daily = getDailyTotals(meals),
        goals = getTargets(d);
      for (const key of ["calories", "protein", "carbs", "fat"] as const) {
        actual[key] += daily[key];
        target[key] += goals[key];
      }
      logged++;
    }
    return { from: dates.at(-1), to: dates[0], logged, actual, target };
  });
  return (
    <>
      <section className="nutrition-panel">
        <h3>Weight trend</h3>
        <form
          className="nutrition-actions"
          onSubmit={(e) => {
            e.preventDefault();
            change([["weight:" + date, Number(weight)]]);
            setWeight("");
            toast("Weigh-in saved");
          }}
        >
          <input
            type="date"
            required
            max={today}
            aria-label="Weigh-in date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="number"
            aria-label="Weight in pounds"
            placeholder="lb"
            required
            min=".1"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button>Save weigh-in</button>
        </form>
        {!weights.some(
          (w) => w.date >= shiftDate(today, 1 - days) && w.date <= today,
        ) && <p>No weigh-ins in this period.</p>}
        {weights
          .filter(
            (w) => w.date >= shiftDate(today, 1 - days) && w.date <= today,
          )
          .map((w) => {
            const window = weights.filter(
              (i) => i.date <= w.date && i.date >= shiftDate(w.date, -6),
            );
            return (
              <p key={w.date}>
                {w.date} · {w.weight} lb · 7-day average{" "}
                {(
                  window.reduce((n, i) => n + i.weight, 0) / window.length
                ).toFixed(1)}{" "}
                lb
              </p>
            );
          })}
      </section>
      <section className="nutrition-panel">
        <h3>Weekly intake</h3>
        {weeks.map((w) => (
          <details key={w.to}>
            <summary>
              {w.from} – {w.to} ·{" "}
              {w.logged
                ? Math.round(w.actual.calories / w.logged) +
                  " / " +
                  Math.round(w.target.calories / w.logged) +
                  " kcal per logged day"
                : "No meals logged"}
            </summary>
            {w.logged > 0 && (
              <>
                <p>{w.logged} logged days · daily average / goal</p>
                {(["protein", "carbs", "fat"] as const).map((k) => (
                  <p key={k}>
                    {k} · {Math.round(w.actual[k] / w.logged)} /{" "}
                    {Math.round(w.target[k] / w.logged)} g
                  </p>
                ))}
              </>
            )}
          </details>
        ))}
      </section>
    </>
  );
}
