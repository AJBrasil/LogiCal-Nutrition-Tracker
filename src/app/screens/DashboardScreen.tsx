import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutDashboard,
  Mic,
  Scan,
  Settings,
  Star,
  Trash2,
} from "lucide-react";

import EntryModal from "../components/EntryModal";
import TabBar from "../components/TabBar";
import { parseFoodNaturalLanguage } from "../services/foodParserService";
import {
  FoodEntry,
  HealthSyncSettings,
  MealPeriod,
  Targets,
  formatDisplayDate,
  getDailyTotals,
  getFavoriteMeals,
  getRecentMeals,
} from "../services/storageService";
import { calculateMacroTargetRatio } from "../utils/nutritionMath";
import type { ModalMacros, Screen } from "../types";

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = calculateMacroTargetRatio(current, target);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span
          className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[11px] font-mono font-medium text-foreground mb-2"
        style={{ fontFamily: "DM Mono, monospace" }}
      >
        {current}
        <span className="text-muted-foreground font-light">/{target}g</span>
      </div>
      <div className="h-[3px] bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  onDelete,
}: {
  entry: FoodEntry;
  onDelete: (id: number) => void;
}) {
  const [swiped, setSwiped] = useState(false);

  return (
    <div
      className="relative overflow-hidden group"
      onMouseEnter={() => setSwiped(true)}
      onMouseLeave={() => setSwiped(false)}
      onClick={() => setSwiped((s) => !s)}
    >
      <div
        className="flex items-center justify-between py-3 px-4 transition-transform duration-200"
        style={{ transform: swiped ? "translateX(-52px)" : "translateX(0)" }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div
            className="text-[13px] text-foreground leading-tight truncate"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {entry.name}
          </div>
          <div
            className="text-[11px] text-muted-foreground mt-0.5 font-mono"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            P{entry.protein} · C{entry.carbs} · F{entry.fat}
            {entry.servingSize && ` · ${entry.servingSize}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className="text-[15px] font-mono font-medium text-foreground"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            {entry.calories}
          </div>
          <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
            kcal
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(entry.id);
        }}
        className="absolute right-0 top-0 bottom-0 w-[52px] flex items-center justify-center bg-destructive transition-opacity duration-200"
        style={{ opacity: swiped ? 1 : 0 }}
        aria-label="Delete entry"
      >
        <Trash2 size={14} className="text-white" />
      </button>
    </div>
  );
}

function TimelineGroup({
  label,
  entries,
  onDelete,
}: {
  label: string;
  entries: FoodEntry[];
  onDelete: (id: number) => void;
}) {
  const groupCals = entries.reduce((a, e) => a + (Number(e.calories) || 0), 0);
  if (entries.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span
          className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-mono text-muted-foreground"
          style={{ fontFamily: "DM Mono, monospace" }}
        >
          {groupCals} kcal
        </span>
      </div>
      <div className="border border-border rounded-lg overflow-hidden mx-4">
        {entries.map((entry, i) => (
          <div key={entry.id}>
            {i > 0 && <div className="h-px bg-border mx-4" />}
            <EntryRow entry={entry} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardScreenProps {
  entries: FoodEntry[];
  dateKey: string;
  targets: Targets;
  healthSettings: HealthSyncSettings;
  onPrevDate: () => void;
  onNextDate: () => void;
  onDeleteEntry: (id: number) => void;
  onLogEntry: (entry: ModalMacros) => void;
  onOpenScanner: () => void;
  onOpenVoice: () => void;
  onOpenSettings: () => void;
  onTabChange: (screen: Screen) => void;
}

export default function DashboardScreen({
  entries,
  dateKey,
  targets,
  healthSettings,
  onPrevDate,
  onNextDate,
  onDeleteEntry,
  onLogEntry,
  onOpenScanner,
  onOpenVoice,
  onOpenSettings,
  onTabChange,
}: DashboardScreenProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<ModalMacros>({
    name: "Meal Entry",
    calories: 200,
    protein: 20,
    carbs: 25,
    fat: 5,
    time: "morning",
  });
  const [inputVal, setInputVal] = useState("");

  const totals = getDailyTotals(entries);
  const remaining = targets.calories - totals.calories;
  const calPct = calculateMacroTargetRatio(totals.calories, targets.calories);

  const displayDate = formatDisplayDate(dateKey);

  const handleInputSubmit = (text: string) => {
    if (!text.trim()) return;

    const parsed = parseFoodNaturalLanguage(text);
    const h = new Date().getHours();
    const period: MealPeriod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";

    setModalData({
      name: parsed.name,
      calories: parsed.calories,
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      time: period,
    });
    setShowModal(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputSubmit(inputVal);
    }
  };

  const favorites = getFavoriteMeals();
  const recents = getRecentMeals(4);
  const quickItems = [
    ...favorites,
    ...recents.filter((r) => !favorites.some((f) => f.name.toLowerCase() === r.name.toLowerCase())),
  ].slice(0, 8);

  const handleQuickSelect = (item: FoodEntry) => {
    const h = new Date().getHours();
    const period: MealPeriod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    setModalData({
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: period,
      servingSize: item.servingSize,
    });
    setShowModal(true);
  };

  const morning = entries.filter((e) => e.time === "morning");
  const afternoon = entries.filter((e) => e.time === "afternoon");
  const evening = entries.filter((e) => e.time === "evening");

  return (
    <div className="relative flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevDate}
            className="p-1 text-muted-foreground active:text-foreground transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="text-[14px] font-medium text-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {displayDate}
          </span>
          <button
            onClick={onNextDate}
            className="p-1 text-muted-foreground active:text-foreground transition-colors"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#FF2D55]/10 text-[#FF2D55] border border-[#FF2D55]/20 text-[10px] font-medium"
            title="Apple Health Status"
          >
            <Heart size={12} />
            <span>Health</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1 text-muted-foreground active:text-foreground transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div
        className="mx-4 rounded-2xl p-4 mb-4 shrink-0 shadow-sm"
        style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div
              className="text-[11px] tracking-widest uppercase text-muted-foreground mb-0.5"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Remaining
            </div>
            <div
              className="text-[32px] font-mono font-medium leading-none"
              style={{
                fontFamily: "DM Mono, monospace",
                color: remaining < 0 ? "#FF4455" : "#00D98A",
              }}
            >
              {remaining < 0 ? "-" : ""}
              {Math.abs(remaining)}
            </div>
            <div
              className="text-[11px] text-muted-foreground mt-0.5"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {totals.calories}{" "}
              <span className="text-muted-foreground font-light">/ {targets.calories} kcal</span>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Goal
            </div>
            <div
              className="text-[13px] font-mono text-foreground"
              style={{ fontFamily: "DM Mono, monospace" }}
            >
              {targets.calories}
            </div>
            <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
              kcal / day
            </div>
          </div>
        </div>

        <div className="h-[5px] rounded-full overflow-hidden mb-4" style={{ background: "#252530" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${calPct}%`,
              background:
                calPct >= 100 ? "#FF4455" : "linear-gradient(90deg, #00D98A 0%, #00BF7A 100%)",
            }}
          />
        </div>

        <div className="flex gap-4">
          <MacroBar label="Protein" current={totals.protein} target={targets.protein} color="#4DA6FF" />
          <div className="w-px bg-border" />
          <MacroBar label="Carbs" current={totals.carbs} target={targets.carbs} color="#FFB84D" />
          <div className="w-px bg-border" />
          <MacroBar label="Fat" current={totals.fat} target={targets.fat} color="#FF6B6B" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {entries.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <LayoutDashboard size={20} />
            </div>
            <div className="text-[14px] font-medium text-foreground mb-1">No meals logged yet</div>
            <div className="text-[12px] text-muted-foreground max-w-xs mx-auto">
              Scan a barcode, use voice logging, or type a meal below to start tracking.
            </div>
          </div>
        ) : (
          <>
            <TimelineGroup label="Morning" entries={morning} onDelete={onDeleteEntry} />
            <TimelineGroup label="Afternoon" entries={afternoon} onDelete={onDeleteEntry} />
            <TimelineGroup label="Evening" entries={evening} onDelete={onDeleteEntry} />
          </>
        )}
        <div className="h-4" />
      </div>

      {/* Quick Add Favorites & Recents Shelf */}
      {quickItems.length > 0 && (
        <div className="px-4 pt-1 pb-1 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
            <span className="flex items-center gap-1 text-[9px] uppercase font-mono tracking-wider text-muted-foreground shrink-0 pr-1">
              <Star size={10} className="text-[#FFB84D]" fill="#FFB84D" />
              Quick:
            </span>
            {quickItems.map((item) => (
              <button
                key={`${item.name}-${item.id}`}
                onClick={() => handleQuickSelect(item)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 active:scale-95 border"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.08)",
                  color: "#CCCCCC",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <span className="truncate max-w-[130px]">{item.name}</span>
                <span className="font-mono text-[10px] text-[#00D98A]">{item.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="px-4 pt-1 pb-2 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "#1A1A22" }}>
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type '3 eggs and sourdough toast' or quick-add..."
            className="flex-1 bg-transparent text-foreground text-[13px] outline-none placeholder:text-muted-foreground min-w-0"
            style={{ fontFamily: "Inter, sans-serif" }}
          />
          <button
            onClick={onOpenVoice}
            className="text-muted-foreground hover:text-[#00D98A] transition-colors shrink-0 ml-1 p-1"
            title="Voice food logging"
          >
            <Mic size={18} />
          </button>
          <button
            onClick={onOpenScanner}
            className="text-muted-foreground hover:text-[#00D98A] transition-colors shrink-0 p-1"
            title="Scan barcode"
          >
            <Scan size={18} />
          </button>
        </div>
      </div>

      <TabBar activeScreen="dashboard" onTabChange={onTabChange} />

      {showModal && (
        <EntryModal
          initialData={modalData}
          onClose={() => setShowModal(false)}
          onLog={(item) => {
            onLogEntry(item);
            setShowModal(false);
            setInputVal("");
          }}
        />
      )}
    </div>
  );
}
