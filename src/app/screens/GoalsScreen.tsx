import { useState } from "react";
import { Check } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";

import TabBar from "../components/TabBar";
import type { Screen } from "../types";
import type { Phase, Targets } from "../services/storageService";

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export default function GoalsScreen({
  targets,
  onSaveTargets,
  onTabChange,
}: {
  targets: Targets;
  onSaveTargets: (t: Targets) => void;
  onTabChange: (s: Screen) => void;
}) {
  const [phase, setPhase] = useState<Phase>(targets.phase);
  const [weeklyRate, setWeeklyRate] = useState(targets.weeklyRate);
  const [protein, setProtein] = useState(targets.protein);
  const [carbs, setCarbs] = useState(targets.carbs);
  const [fat, setFat] = useState(targets.fat);
  const [proteinLocked, setProteinLocked] = useState(targets.proteinLocked);
  const [saved, setSaved] = useState(false);

  const baseCalories = {
    cut: Math.round(2800 - weeklyRate * 500),
    recomp: 2800,
    bulk: Math.round(2800 + weeklyRate * 250),
  }[phase];

  const totalMacroCals = protein * 4 + carbs * 4 + fat * 9;

  const handleCarbChange = (val: number) => {
    setCarbs(val);
    if (!proteinLocked) {
      const remaining = Math.round((baseCalories - val * 4 - fat * 9) / 4);
      setProtein(clamp(remaining, 100, 350));
    }
  };

  const handleFatChange = (val: number) => {
    setFat(val);
    if (!proteinLocked) {
      const remaining = Math.round((baseCalories - carbs * 4 - val * 9) / 4);
      setProtein(clamp(remaining, 100, 350));
    }
  };

  const handleSave = () => {
    try {
      Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // ignore
    }
    const updated: Targets = {
      phase,
      weeklyRate,
      calories: baseCalories,
      protein,
      carbs,
      fat,
      proteinLocked,
    };
    onSaveTargets(updated);
    setSaved(true);
    toast.success("Fitness Targets Updated", {
      description: `Daily calorie goal set to ${baseCalories} kcal (${protein}P · ${carbs}C · ${fat}F)`,
    });
    setTimeout(() => setSaved(false), 2000);
  };

  const phaseLabels: { key: Phase; label: string; sub: string }[] = [
    { key: "cut", label: "Cut", sub: "Fat Loss" },
    { key: "recomp", label: "Recomp", sub: "Maintain" },
    { key: "bulk", label: "Bulk", sub: "Muscle" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-center px-4 pt-12 pb-4 shrink-0">
        <span
          className="text-[16px] font-medium text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Fitness Strategy & Targets
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: "none" }}>
        {/* Phase toggle */}
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{
            background: "#141418",
            border: "1px solid rgba(255,255,255,0.07)",
            padding: "4px",
          }}
        >
          <div className="grid grid-cols-3 gap-1">
            {phaseLabels.map(({ key, label, sub }) => (
              <button
                key={key}
                onClick={() => setPhase(key)}
                className="py-2.5 rounded-lg transition-all duration-200 flex flex-col items-center"
                style={{
                  background: phase === key ? "#00D98A" : "transparent",
                  color: phase === key ? "#0A0A0C" : "#666678",
                }}
              >
                <span className="text-[12px] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
                  {label}
                </span>
                <span
                  className="text-[9px] tracking-wider uppercase mt-0.5"
                  style={{ fontFamily: "Inter, sans-serif", opacity: 0.7 }}
                >
                  {sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Rate slider */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Weekly Rate
            </div>
            <div
              className="text-[11px] font-mono text-muted-foreground"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {phase === "cut" ? "-" : "+"}
              {weeklyRate} lbs/wk
            </div>
          </div>

          <input
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={weeklyRate}
            onChange={(e) => setWeeklyRate(parseFloat(e.target.value))}
            className="w-full mb-4 cursor-pointer"
            style={{ accentColor: "#00D98A" }}
          />

          <div className="text-center">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Calculated Target
            </div>
            <div
              className="text-[36px] font-mono font-medium leading-none"
              style={{ fontFamily: "DM Mono, monospace", color: "#00D98A" }}
            >
              {baseCalories.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
              kcal / day
            </div>
          </div>
        </div>

        {/* Macro overrides */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Fine-Tune Macros
            </div>
            <div
              className="text-[11px] font-mono text-muted-foreground"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {totalMacroCals} <span className="text-muted-foreground opacity-60">/ {baseCalories} kcal</span>
            </div>
          </div>

          {/* Protein row */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="text-[11px] tracking-widest uppercase text-muted-foreground"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Protein
                </div>
                <button
                  onClick={() => setProteinLocked((l) => !l)}
                  className="text-[9px] px-1.5 py-0.5 rounded transition-all duration-150"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    background: proteinLocked ? "rgba(0,217,138,0.15)" : "rgba(255,255,255,0.06)",
                    color: proteinLocked ? "#00D98A" : "#666678",
                    border: `1px solid ${proteinLocked ? "rgba(0,217,138,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {proteinLocked ? "LOCKED" : "LOCK"}
                </button>
              </div>
              <span
                className="text-[15px] font-mono font-medium text-foreground"
                style={{ fontFamily: "DM Mono, monospace" }}
              >
                {protein}g
              </span>
            </div>
            <input
              type="range"
              min={80}
              max={350}
              step={5}
              value={protein}
              onChange={(e) => setProtein(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer"
              style={{ accentColor: "#4DA6FF" }}
              disabled={!proteinLocked}
            />
          </div>

          {/* Carbs row */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <div
                className="text-[11px] tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Carbohydrates
              </div>
              <span
                className="text-[15px] font-mono font-medium text-foreground"
                style={{ fontFamily: "DM Mono, monospace" }}
              >
                {carbs}g
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={400}
              step={5}
              value={carbs}
              onChange={(e) => handleCarbChange(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer"
              style={{ accentColor: "#FFB84D" }}
            />
          </div>

          {/* Fat row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div
                className="text-[11px] tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Fats
              </div>
              <span
                className="text-[15px] font-mono font-medium text-foreground"
                style={{ fontFamily: "DM Mono, monospace" }}
              >
                {fat}g
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={fat}
              onChange={(e) => handleFatChange(parseInt(e.target.value, 10))}
              className="w-full cursor-pointer"
              style={{ accentColor: "#FF6B6B" }}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div
        className="px-4 pt-2 pb-10 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            background: saved ? "rgba(0,217,138,0.15)" : "#00D98A",
            color: saved ? "#00D98A" : "#0A0A0C",
            border: saved ? "1px solid rgba(0,217,138,0.3)" : "none",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {saved ? (
            <>
              <Check size={16} />
              Targets Updated
            </>
          ) : (
            "Save & Update Targets"
          )}
        </button>
      </div>

      <TabBar activeScreen="goals" onTabChange={onTabChange} />
    </div>
  );
}
