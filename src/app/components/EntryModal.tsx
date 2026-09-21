import { useState } from "react";
import { Star } from "lucide-react";

import { isFavoriteMeal, saveFavoriteMeal } from "../services/storageService";
import type { MealPeriod } from "../services/storageService";
import type { ModalMacros } from "../types";

const PERIOD_LABELS: { key: MealPeriod; label: string; hint: string }[] = [
  { key: "morning", label: "Morning", hint: "6am-12pm" },
  { key: "afternoon", label: "Afternoon", hint: "12-5pm" },
  { key: "evening", label: "Evening", hint: "5pm+" },
];

interface EntryModalProps {
  initialData: ModalMacros;
  onClose: () => void;
  onLog: (data: ModalMacros) => void;
}

export default function EntryModal({ initialData, onClose, onLog }: EntryModalProps) {
  const [data, setData] = useState<ModalMacros>(initialData);
  const [isFav, setIsFav] = useState<boolean>(() => isFavoriteMeal(initialData.name));

  const updateMacro = (key: keyof Omit<ModalMacros, "name" | "time" | "servingSize">, val: string) => {
    const n = parseInt(val, 10) || 0;
    setData((prev) => ({ ...prev, [key]: n }));
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-200"
        style={{ background: "#1A1A22", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        <div className="px-4 pt-2 pb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] tracking-widest uppercase text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Food Item
              </span>
              <button
                type="button"
                onClick={() => setIsFav((prev) => !prev)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors border"
                style={{
                  background: isFav ? "rgba(255,184,77,0.15)" : "rgba(255,255,255,0.04)",
                  borderColor: isFav ? "rgba(255,184,77,0.3)" : "rgba(255,255,255,0.08)",
                  color: isFav ? "#FFB84D" : "#888899",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Star size={11} fill={isFav ? "#FFB84D" : "none"} />
                <span>{isFav ? "Favorited" : "Favorite"}</span>
              </button>
            </div>
            <input
              type="text"
              value={data.name}
              onChange={(e) => {
                const newName = e.target.value;
                setData((prev) => ({ ...prev, name: newName }));
                setIsFav(isFavoriteMeal(newName));
              }}
              className="w-full bg-[#252530] text-foreground text-[14px] font-medium px-3 py-2 rounded-xl outline-none border border-white/5"
              style={{ fontFamily: "Inter, sans-serif" }}
            />
          </div>

          <div className="mb-4">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Add to
            </div>
            <div className="flex gap-2">
              {PERIOD_LABELS.map(({ key, label, hint }) => {
                const active = data.time === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setData((prev) => ({ ...prev, time: key }))}
                    className="flex-1 flex flex-col items-center py-2 rounded-xl transition-all duration-150"
                    style={{
                      background: active ? "rgba(0,217,138,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? "rgba(0,217,138,0.35)" : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <span
                      className="text-[12px] font-medium"
                      style={{ fontFamily: "Inter, sans-serif", color: active ? "#00D98A" : "#888899" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[9px] mt-0.5"
                      style={{ fontFamily: "DM Mono, monospace", color: active ? "rgba(0,217,138,0.6)" : "#444455" }}
                    >
                      {hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border mb-4" />

          <div className="flex items-baseline justify-between mb-3">
            <span
              className="text-[11px] tracking-widest uppercase text-muted-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Calories
            </span>
            <div className="rounded-md overflow-hidden" style={{ background: "#252530" }}>
              <input
                type="number"
                value={data.calories}
                onChange={(e) => updateMacro("calories", e.target.value)}
                className="w-24 text-right text-[22px] font-mono font-medium bg-transparent text-[#00D98A] px-2 py-1 outline-none"
                style={{ fontFamily: "DM Mono, monospace" }}
              />
            </div>
          </div>

          {(["protein", "carbs", "fat"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between mb-3">
              <span
                className="text-[11px] tracking-widest uppercase text-muted-foreground capitalize"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {key}
              </span>
              <div className="flex items-center gap-2">
                <div className="rounded-md overflow-hidden" style={{ background: "#252530" }}>
                  <input
                    type="number"
                    value={data[key]}
                    onChange={(e) => updateMacro(key, e.target.value)}
                    className="w-16 text-right text-[15px] font-mono font-medium bg-transparent text-foreground px-2 py-1.5 outline-none"
                    style={{ fontFamily: "DM Mono, monospace" }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground w-4" style={{ fontFamily: "DM Mono, monospace" }}>
                  g
                </span>
              </div>
            </div>
          ))}

          <div className="h-px bg-border mb-4" />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-border text-foreground text-[14px] font-medium transition-colors active:opacity-70"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (isFav && data.name.trim()) {
                  saveFavoriteMeal(data);
                }
                onLog(data);
              }}
              className="flex-[2] py-3.5 rounded-xl text-[14px] font-medium transition-colors active:opacity-80"
              style={{ background: "#00D98A", color: "#0A0A0C", fontFamily: "Inter, sans-serif" }}
            >
              Log to {PERIOD_LABELS.find((p) => p.key === data.time)?.label ?? data.time}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
