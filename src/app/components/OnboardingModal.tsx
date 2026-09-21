import { useState } from "react";
import {
  Flame,
  Activity,
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Heart,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import type { Phase, Targets, HealthSyncSettings } from "../services/storageService";
import {
  calculateBalancedProtein,
  calculateBasePhaseCalories,
  calculateMacroCalories,
} from "../utils/nutritionMath";

interface OnboardingModalProps {
  initialTargets: Targets;
  initialHealthSettings: HealthSyncSettings;
  onComplete: (targets: Targets, syncHealth: boolean) => void;
  onSkip: () => void;
}

export default function OnboardingModal({
  initialTargets,
  initialHealthSettings,
  onComplete,
  onSkip,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Strategy
  const [phase, setPhase] = useState<Phase>(initialTargets.phase);
  const [weeklyRate, setWeeklyRate] = useState<number>(initialTargets.weeklyRate);

  // Step 2: Macros
  const baseCalories = calculateBasePhaseCalories(phase, weeklyRate);
  const [protein, setProtein] = useState<number>(initialTargets.protein);
  const [carbs, setCarbs] = useState<number>(initialTargets.carbs);
  const [fat, setFat] = useState<number>(initialTargets.fat);
  const [proteinLocked, setProteinLocked] = useState<boolean>(initialTargets.proteinLocked);

  // Step 3: Apple Health
  const [syncHealth, setSyncHealth] = useState<boolean>(initialHealthSettings.autoSync ?? true);

  const totalMacroCals = calculateMacroCalories(protein, carbs, fat);

  const triggerHaptic = (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      Haptics.impact({ style });
    } catch {
      // ignore outside native device
    }
  };

  const handleCarbChange = (val: number) => {
    setCarbs(val);
    if (!proteinLocked) {
      setProtein(calculateBalancedProtein(baseCalories, val, fat));
    }
  };

  const handleFatChange = (val: number) => {
    setFat(val);
    if (!proteinLocked) {
      setProtein(calculateBalancedProtein(baseCalories, carbs, val));
    }
  };

  const applyPreset = (pRatio: number, cRatio: number, fRatio: number) => {
    triggerHaptic(ImpactStyle.Light);
    const pCals = baseCalories * pRatio;
    const cCals = baseCalories * cRatio;
    const fCals = baseCalories * fRatio;
    setProtein(Math.round(pCals / 4));
    setCarbs(Math.round(cCals / 4));
    setFat(Math.round(fCals / 9));
  };

  const handleFinish = () => {
    triggerHaptic(ImpactStyle.Heavy);
    const configuredTargets: Targets = {
      phase,
      weeklyRate,
      calories: baseCalories,
      protein,
      carbs,
      fat,
      proteinLocked,
    };
    onComplete(configuredTargets, syncHealth);
  };

  const phases: {
    key: Phase;
    title: string;
    subtitle: string;
    description: string;
    icon: typeof Flame;
    color: string;
  }[] = [
    {
      key: "cut",
      title: "Cut",
      subtitle: "Fat Loss & Leanness",
      description: "Steady caloric deficit to burn fat while safeguarding lean muscle.",
      icon: Flame,
      color: "#FF6B6B",
    },
    {
      key: "recomp",
      title: "Recomp",
      subtitle: "Maintain & Rebuild",
      description: "Maintenance energy for steady body recomposition and peak performance.",
      icon: Activity,
      color: "#00D98A",
    },
    {
      key: "bulk",
      title: "Bulk",
      subtitle: "Lean Muscle Growth",
      description: "Controlled caloric surplus to fuel strength and muscle hypertrophy.",
      icon: Dumbbell,
      color: "#4DA6FF",
    },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C] flex flex-col justify-between overflow-hidden text-white select-none">
      {/* Top Header & Progress */}
      <div className="px-5 pt-12 pb-3 shrink-0 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          {step > 1 ? (
            <button
              onClick={() => {
                triggerHaptic();
                setStep((s) => (s - 1) as 1 | 2 | 3);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00D98A] tracking-wider uppercase">
              <Sparkles size={14} />
              <span>LogiCal Setup</span>
            </div>
          )}

          <button
            onClick={() => {
              triggerHaptic();
              onSkip();
            }}
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>

        {/* 3 Step Progress Bars */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? "bg-[#00D98A]" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: "none" }}>
        {/* STEP 1: GOAL & STRATEGY */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <div className="text-[11px] font-semibold text-[#00D98A] uppercase tracking-wider mb-1">
                Step 1 of 3
              </div>
              <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                What is your primary fitness goal?
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                We'll compute your baseline daily energy target to match your training.
              </p>
            </div>

            {/* Goal Cards */}
            <div className="space-y-2.5">
              {phases.map(({ key, title, subtitle, description, icon: Icon, color }) => {
                const isSelected = phase === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      triggerHaptic();
                      setPhase(key);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.99] ${
                      isSelected
                        ? "bg-[#141418] border-[#00D98A] shadow-[0_0_20px_rgba(0,217,138,0.15)]"
                        : "bg-[#141418]/60 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? `${color}25` : "rgba(255,255,255,0.06)",
                            color: color,
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-white">{title}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground">
                              {subtitle}
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                            {description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          isSelected
                            ? "bg-[#00D98A] border-[#00D98A] text-[#0A0A0C]"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Weekly Rate Slider (Cut & Bulk) */}
            {phase !== "recomp" && (
              <div className="p-4 rounded-2xl bg-[#141418] border border-white/10">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Weekly Rate of Progress
                  </span>
                  <span className="text-[13px] font-mono font-medium text-[#00D98A]">
                    {phase === "cut" ? "-" : "+"}
                    {weeklyRate} lbs / week
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={2.0}
                  step={0.25}
                  value={weeklyRate}
                  onChange={(e) => setWeeklyRate(parseFloat(e.target.value))}
                  className="w-full accent-[#00D98A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                  <span>0.25 lbs (Gentle)</span>
                  <span>1.0 lbs (Standard)</span>
                  <span>2.0 lbs (Aggressive)</span>
                </div>
              </div>
            )}

            {/* Calculated Calorie Output Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#141418] to-[#101014] border border-[#00D98A]/30 text-center shadow-lg">
              <div className="text-[11px] tracking-widest uppercase text-muted-foreground font-medium mb-1">
                Your Calculated Daily Target
              </div>
              <div className="text-[38px] font-mono font-bold text-[#00D98A] leading-none">
                {baseCalories.toLocaleString()}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">
                kcal / day · {phase === "cut" ? "Fat-loss deficit" : phase === "bulk" ? "Muscle-building surplus" : "Maintenance baseline"}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MACRONUTRIENT SPLIT */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <div className="text-[11px] font-semibold text-[#00D98A] uppercase tracking-wider mb-1">
                Step 2 of 3
              </div>
              <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                Dial In Your Macro Split
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                Calibrated to your {baseCalories.toLocaleString()} kcal target. Adjust to match your diet preference.
              </p>
            </div>

            {/* Live Calorie Sum Status */}
            <div className="p-3 rounded-xl bg-[#141418] border border-white/10 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Summed Macro Energy
              </div>
              <div className="text-[13px] font-mono">
                <span
                  className={`font-semibold ${
                    Math.abs(totalMacroCals - baseCalories) < 25 ? "text-[#00D98A]" : "text-[#FFB84D]"
                  }`}
                >
                  {totalMacroCals}
                </span>{" "}
                <span className="text-muted-foreground opacity-60">/ {baseCalories} kcal</span>
              </div>
            </div>

            {/* Macro Ratio Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyPreset(0.35, 0.4, 0.25)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center active:scale-95 transition-all"
              >
                <div className="text-[11px] font-semibold text-white">Balanced</div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">35P · 40C · 25F</div>
              </button>
              <button
                onClick={() => applyPreset(0.4, 0.35, 0.25)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#4DA6FF]/40 text-center active:scale-95 transition-all"
              >
                <div className="text-[11px] font-semibold text-[#4DA6FF]">High Protein</div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">40P · 35C · 25F</div>
              </button>
              <button
                onClick={() => applyPreset(0.3, 0.2, 0.5)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center active:scale-95 transition-all"
              >
                <div className="text-[11px] font-semibold text-white">Lower Carb</div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">30P · 20C · 50F</div>
              </button>
            </div>

            {/* Protein Slider */}
            <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Protein
                  </span>
                  <button
                    onClick={() => {
                      triggerHaptic();
                      setProteinLocked(!proteinLocked);
                    }}
                    className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-mono transition-all ${
                      proteinLocked
                        ? "bg-[#4DA6FF]/20 text-[#4DA6FF] border border-[#4DA6FF]/40"
                        : "bg-white/5 text-muted-foreground border border-white/10"
                    }`}
                  >
                    {proteinLocked ? <Lock size={10} /> : <Unlock size={10} />}
                    {proteinLocked ? "LOCKED" : "AUTO"}
                  </button>
                </div>
                <div className="text-[14px] font-mono font-bold text-[#4DA6FF]">
                  {protein}g{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({protein * 4} kcal)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={80}
                max={350}
                step={5}
                value={protein}
                onChange={(e) => setProtein(parseInt(e.target.value, 10))}
                disabled={!proteinLocked}
                className="w-full accent-[#4DA6FF] cursor-pointer"
              />
            </div>

            {/* Carbs Slider */}
            <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Carbohydrates
                </span>
                <div className="text-[14px] font-mono font-bold text-[#FFB84D]">
                  {carbs}g{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({carbs * 4} kcal)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={40}
                max={450}
                step={5}
                value={carbs}
                onChange={(e) => handleCarbChange(parseInt(e.target.value, 10))}
                className="w-full accent-[#FFB84D] cursor-pointer"
              />
            </div>

            {/* Fat Slider */}
            <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Healthy Fats
                </span>
                <div className="text-[14px] font-mono font-bold text-[#FF6B6B]">
                  {fat}g{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({fat * 9} kcal)
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={20}
                max={150}
                step={5}
                value={fat}
                onChange={(e) => handleFatChange(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF6B6B] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 3: APPLE HEALTH & PRIVACY */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <div className="text-[11px] font-semibold text-[#00D98A] uppercase tracking-wider mb-1">
                Step 3 of 3
              </div>
              <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight">
                Privacy-First Nutrition
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                No accounts or cloud logins. Your data lives on your device and syncs to Apple Health.
              </p>
            </div>

            {/* Core Values Cards */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/10 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00D98A]/15 text-[#00D98A] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">100% Local & Private</div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    Zero accounts, zero trackers, and zero external databases. All meals and targets are stored locally.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#141418] border border-white/10 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF2D55]/15 text-[#FF2D55] flex items-center justify-center shrink-0 mt-0.5">
                  <Heart size={20} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white">Native Apple HealthKit</div>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    Writes dietary energy, protein, carbohydrates, and fat samples directly into the Apple Health app.
                  </p>
                </div>
              </div>
            </div>

            {/* Apple Health Auto-Sync Toggle */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#141418] to-[#111115] border border-white/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FF2D55]/20 text-[#FF2D55] flex items-center justify-center">
                    <Heart size={16} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white">Auto-Sync to Apple Health</div>
                    <div className="text-[11px] text-muted-foreground">Syncs as soon as meals are logged</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={syncHealth}
                  onChange={(e) => {
                    triggerHaptic();
                    setSyncHealth(e.target.checked);
                  }}
                  className="w-5 h-5 rounded accent-[#00D98A] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA Action Bar */}
      <div className="p-5 shrink-0 border-t border-white/10 bg-[#0A0A0C]">
        {step === 1 && (
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Medium);
              setStep(2);
            }}
            className="w-full py-4 rounded-xl bg-[#00D98A] text-[#0A0A0C] font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,217,138,0.3)] active:scale-[0.98] transition-all"
          >
            <span>Next: Set Macros</span>
            <ArrowRight size={18} />
          </button>
        )}

        {step === 2 && (
          <button
            onClick={() => {
              triggerHaptic(ImpactStyle.Medium);
              setStep(3);
            }}
            className="w-full py-4 rounded-xl bg-[#00D98A] text-[#0A0A0C] font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,217,138,0.3)] active:scale-[0.98] transition-all"
          >
            <span>Next: Health & Launch</span>
            <ArrowRight size={18} />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleFinish}
            className="w-full py-4 rounded-xl bg-[#00D98A] text-[#0A0A0C] font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,217,138,0.4)] active:scale-[0.98] transition-all"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>Start Tracking Now</span>
          </button>
        )}
      </div>
    </div>
  );
}

