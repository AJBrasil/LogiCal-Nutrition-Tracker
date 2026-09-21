import { Toaster } from "sonner";

import { parseFoodNaturalLanguage } from "./services/foodParserService";
import { useNutritionState } from "./hooks/useNutritionState";
import type { MealPeriod } from "./services/storageService";

import BarcodeScannerModal from "./components/BarcodeScannerModal";
import OnboardingModal from "./components/OnboardingModal";
import SettingsModal from "./components/SettingsModal";
import VoiceInputModal from "./components/VoiceInputModal";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import GoalsScreen from "./screens/GoalsScreen";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    screen,
    setScreen,
    dateKey,
    entries,
    targets,
    healthSettings,
    setHealthSettings,
    showScanner,
    setShowScanner,
    showVoice,
    setShowVoice,
    showSettings,
    setShowSettings,
    showOnboarding,
    setShowOnboarding,
    handleCompleteOnboarding,
    handleSkipOnboarding,
    reloadData,
    handlePrevDate,
    handleNextDate,
    handleDeleteEntry,
    handleLogEntry,
    handleSaveTargets,
  } = useNutritionState();

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-0 sm:p-6 select-none">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Phone shell / Responsive mobile container */}
      <div
        className="relative overflow-hidden w-full h-full sm:w-[390px] sm:h-[844px] sm:rounded-[50px] bg-[#0A0A0C] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_80px_rgba(0,0,0,0.7),0_0_0_8px_#111115,0_0_0_9px_rgba(255,255,255,0.06)]"
      >
        {/* Notch - only on desktop container frame */}
        <div
          className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 z-30"
          style={{
            width: 126,
            height: 34,
            background: "#0A0A0C",
            borderRadius: "0 0 20px 20px",
          }}
        />

        {/* Screen container */}
        <div className="absolute inset-0 overflow-hidden sm:rounded-[50px]">
          {screen === "dashboard" && (
            <DashboardScreen
              entries={entries}
              dateKey={dateKey}
              targets={targets}
              healthSettings={healthSettings}
              onPrevDate={handlePrevDate}
              onNextDate={handleNextDate}
              onDeleteEntry={handleDeleteEntry}
              onLogEntry={handleLogEntry}
              onOpenScanner={() => setShowScanner(true)}
              onOpenVoice={() => setShowVoice(true)}
              onOpenSettings={() => setShowSettings(true)}
              onTabChange={setScreen}
            />
          )}

          {screen === "goals" && (
            <GoalsScreen
              targets={targets}
              onSaveTargets={handleSaveTargets}
              onTabChange={setScreen}
            />
          )}

          {screen === "analytics" && (
            <AnalyticsScreen
              targets={targets}
              onTabChange={setScreen}
            />
          )}
        </div>

        {/* Full-screen Modals */}
        {showScanner && (
          <BarcodeScannerModal
            onClose={() => setShowScanner(false)}
            onLogProduct={(p) => {
              handleLogEntry({
                name: p.name,
                calories: p.calories,
                protein: p.protein,
                carbs: p.carbs,
                fat: p.fat,
                time: p.time,
                servingSize: p.servingSize,
              });
            }}
          />
        )}

        {showVoice && (
          <VoiceInputModal
            onClose={() => setShowVoice(false)}
            onVoiceResult={(transcript) => {
              const parsed = parseFoodNaturalLanguage(transcript);
              const h = new Date().getHours();
              const period: MealPeriod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
              handleLogEntry({
                name: parsed.name,
                calories: parsed.calories,
                protein: parsed.protein,
                carbs: parsed.carbs,
                fat: parsed.fat,
                time: period,
              });
            }}
          />
        )}

        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            entries={entries}
            currentDateKey={dateKey}
            targets={targets}
            healthSettings={healthSettings}
            onUpdateHealthSettings={setHealthSettings}
            onDataReload={reloadData}
            onOpenOnboarding={() => setShowOnboarding(true)}
          />
        )}

        {showOnboarding && (
          <OnboardingModal
            initialTargets={targets}
            initialHealthSettings={healthSettings}
            onComplete={handleCompleteOnboarding}
            onSkip={handleSkipOnboarding}
          />
        )}
      </div>
    </div>
  );
}
