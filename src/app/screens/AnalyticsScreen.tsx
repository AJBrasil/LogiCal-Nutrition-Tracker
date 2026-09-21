import { useState } from "react";

import TabBar from "../components/TabBar";
import { getAnalyticsData } from "../services/storageService";
import type { Targets } from "../services/storageService";
import type { Screen } from "../types";

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

type TimeFrame = "7d" | "30d";
type DataKey = "cals" | "protein" | "carbs" | "fat";

function isOnTarget(val: number, target: number) {
  if (val === 0 || !target) return false;
  return Math.abs(val - target) / target <= 0.1;
}

export default function AnalyticsScreen({
  targets,
  onTabChange,
}: {
  targets: Targets;
  onTabChange: (s: Screen) => void;
}) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("7d");
  const [goalAlerts, setGoalAlerts] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const daysCount = timeFrame === "30d" ? 30 : 7;
  const data = getAnalyticsData(daysCount);

  const maxCal = timeFrame === "30d" ? 3200 : 3000;
  const targetLineY = (targets.calories / maxCal) * 100;

  const activeDays = data.filter((d) => d.logged);
  const missedCount = data.filter((d) => !d.logged).length;

  const selectedDay = selectedIdx !== null ? data[selectedIdx] : null;

  const avg = (key: DataKey) => {
    const vals = activeDays.map((d) => d[key] as number);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const metDays = (key: DataKey, target: number) =>
    activeDays.filter((d) => isOnTarget(d[key] as number, target)).length;

  const fluctuation = (key: DataKey) => {
    const vals = activeDays.map((d) => d[key] as number).filter(Boolean);
    if (!vals.length) return 0;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const pctDiffs = vals.map((v) => Math.abs((v - mean) / mean) * 100);
    return Math.round(pctDiffs.reduce((a, b) => a + b, 0) / pctDiffs.length);
  };

  const displayVal = (key: DataKey) =>
    selectedDay ? (selectedDay[key] as number) : avg(key);

  const periodLabel = timeFrame === "7d" ? "Past 7 Days" : "Past 30 Days";

  const macroRows: { label: string; key: DataKey; unit: string; color: string; target: number }[] = [
    { label: "Calories", key: "cals", unit: "kcal", color: "#00D98A", target: targets.calories },
    { label: "Protein", key: "protein", unit: "g", color: "#4DA6FF", target: targets.protein },
    { label: "Carbs", key: "carbs", unit: "g", color: "#FFB84D", target: targets.carbs },
    { label: "Fat", key: "fat", unit: "g", color: "#FF6B6B", target: targets.fat },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 shrink-0">
        <div
          className="text-[11px] tracking-widest uppercase text-muted-foreground mb-3"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Macro Trends & Insights
        </div>
        {/* Time frame segmented control */}
        <div className="flex rounded-xl overflow-hidden p-[3px]" style={{ background: "#1A1A22" }}>
          {(["7d", "30d"] as TimeFrame[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTimeFrame(t);
                setSelectedIdx(null);
              }}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{
                fontFamily: "Inter, sans-serif",
                background: timeFrame === t ? "#00D98A" : "transparent",
                color: timeFrame === t ? "#0A0A0C" : "#666678",
              }}
            >
              {t === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
        {/* Bar chart card */}
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Calories — {periodLabel}
            </div>
            {/* Goal alerts toggle */}
            <button
              onClick={() => setGoalAlerts((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150"
              style={{
                background: goalAlerts ? "rgba(0,217,138,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${goalAlerts ? "rgba(0,217,138,0.25)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: goalAlerts ? "#00D98A" : "#444455" }}
              />
              <span
                className="text-[9px] tracking-wider uppercase"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: goalAlerts ? "#00D98A" : "#555566",
                }}
              >
                Goal Alerts
              </span>
            </button>
          </div>

          {/* Chart area with target line overlay */}
          <div className="relative" style={{ height: 96 }}>
            {/* Target dashed line */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                bottom: `${clamp(targetLineY, 5, 95)}%`,
                borderTop: "1.5px dashed rgba(255,255,255,0.35)",
                zIndex: 2,
              }}
            />

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-1.5">
              {data.map((d, i) => {
                const pct = d.logged ? clamp((d.cals / maxCal) * 100, 4, 100) : 4;
                const onTarget = isOnTarget(d.cals, targets.calories);
                const overMiss = goalAlerts && d.logged && !onTarget;
                const isSelected = selectedIdx === i;

                let barBg: string;
                if (!d.logged) {
                  barBg = "rgba(255,255,255,0.06)";
                } else if (isSelected) {
                  barBg = "#00D98A";
                } else if (overMiss) {
                  barBg = d.cals > targets.calories ? "#FF6B6B" : "#4DA6FF";
                } else if (onTarget) {
                  barBg = "rgba(0,217,138,0.75)";
                } else {
                  barBg =
                    "linear-gradient(180deg, rgba(0,217,138,0.45) 0%, rgba(0,217,138,0.2) 100%)";
                }

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                    className="flex-1 flex flex-col justify-end rounded-t-sm transition-all duration-200 focus:outline-none"
                    style={{
                      height: "100%",
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label={`${d.day}: ${d.cals} kcal`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${pct}%`,
                        background: barBg,
                        boxShadow: isSelected ? "0 0 0 1.5px #00D98A" : "none",
                        opacity: !d.logged ? 0.4 : 1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day labels */}
          <div className="flex gap-1.5 mt-2">
            {data.map((d, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[8px] transition-colors"
                style={{
                  fontFamily: "DM Mono, monospace",
                  color: selectedIdx === i ? "#00D98A" : d.logged ? "#444455" : "#2A2A38",
                }}
              >
                {timeFrame === "30d" ? (parseInt(d.day, 10) % 5 === 0 ? d.day : "") : d.day}
              </div>
            ))}
          </div>

          {/* Target legend */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1" style={{ borderTop: "1.5px dashed rgba(255,255,255,0.25)" }} />
            <span
              className="text-[9px] font-mono text-muted-foreground"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {targets.calories.toLocaleString()} target
            </span>
          </div>

          {selectedDay && (
            <div
              className="mt-3 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(0,217,138,0.07)",
                border: "1px solid rgba(0,217,138,0.15)",
              }}
            >
              <div
                className="text-[10px] font-mono"
                style={{ fontFamily: "DM Mono, monospace", color: "#00D98A" }}
              >
                {selectedDay.date} ·{" "}
                {selectedDay.logged
                  ? `${selectedDay.cals.toLocaleString()} kcal logged (${selectedDay.protein}P · ${selectedDay.carbs}C · ${selectedDay.fat}F)`
                  : "No meal logged for this date"}
              </div>
            </div>
          )}
        </div>

        {/* Averages card */}
        <div
          className="rounded-2xl p-4 mb-3"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {selectedDay
                ? `${selectedDay.date} — Detail`
                : `${timeFrame === "7d" ? "7" : "30"}-Day Averages`}
            </div>
            {!selectedDay && (
              <div
                className="text-[9px] text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {activeDays.length}/{data.length} days logged
              </div>
            )}
          </div>

          {macroRows.map((row) => {
            const val = displayVal(row.key);
            const met = metDays(row.key, row.target);
            const fluct = fluctuation(row.key);
            const onTgt = isOnTarget(val, row.target);
            return (
              <div
                key={row.label}
                className="flex items-center py-2.5 border-b border-border last:border-0 gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.color }} />
                <span
                  className="text-[12px] text-muted-foreground w-16 shrink-0"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {row.label}
                </span>

                {/* Value */}
                <span
                  className="text-[15px] font-mono font-medium text-foreground flex-1"
                  style={{ fontFamily: "DM Mono, monospace" }}
                >
                  {val > 0 ? val.toLocaleString() : "—"}
                  <span className="text-[10px] text-muted-foreground font-light ml-0.5">{row.unit}</span>
                </span>

                {/* Consistency badge */}
                {!selectedDay && val > 0 && (
                  <div
                    className="text-[9px] px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      fontFamily: "DM Mono, monospace",
                      background: onTgt ? "rgba(0,217,138,0.1)" : "rgba(255,255,255,0.05)",
                      color: onTgt ? "#00D98A" : "#555566",
                      border: `1px solid ${onTgt ? "rgba(0,217,138,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {row.key === "cals" ? `±${fluct}%` : `${met}/${activeDays.length}d`}
                  </div>
                )}

                {/* On-target dot for selected day */}
                {selectedDay && val > 0 && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: onTgt ? "#00D98A" : "rgba(255,255,255,0.12)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Dynamic Trend Insights card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Trend Insights
            </div>
            <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div className="space-y-3">
            {missedCount > 0 && (
              <div className="flex gap-3">
                <div
                  className="w-1 rounded-full shrink-0 mt-1 self-stretch"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <p
                  className="text-[12px] leading-relaxed text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  You have{" "}
                  <span className="text-foreground font-medium">
                    {missedCount} unlogged day{missedCount > 1 ? "s" : ""}
                  </span>{" "}
                  this period. Your average protein across active days is{" "}
                  <span className="text-foreground font-medium">{avg("protein")}g</span>.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <div
                className="w-1 rounded-full shrink-0 mt-1 self-stretch"
                style={{ background: "rgba(0,217,138,0.35)" }}
              />
              <p
                className="text-[12px] leading-relaxed text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Calorie variance is{" "}
                <span className="text-foreground font-medium">±{fluctuation("cals")}%</span>.{" "}
                {fluctuation("cals") < 10
                  ? "Consistency is strong and tightly aligned with your goals."
                  : "Daily intake varies slightly—aim to keep meals predictable."}
              </p>
            </div>

            <div className="flex gap-3">
              <div
                className="w-1 rounded-full shrink-0 mt-1 self-stretch"
                style={{ background: "rgba(77,166,255,0.35)" }}
              />
              <p
                className="text-[12px] leading-relaxed text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Protein hit target on{" "}
                <span className="text-foreground font-medium">
                  {metDays("protein", targets.protein)}/{activeDays.length || 1} logged days
                </span>
                .{" "}
                {metDays("protein", targets.protein) >= (activeDays.length || 1) * 0.7
                  ? "Your muscle-maintenance and protein synthesis goals are on track."
                  : "Consider adding a mid-day protein source like Greek yogurt or a whey shake."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <TabBar activeScreen="analytics" onTabChange={onTabChange} />
    </div>
  );
}
