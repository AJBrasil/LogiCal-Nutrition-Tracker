import { Toaster } from "sonner";

import { parseFoodNaturalLanguage } from "./services/foodParserService";
import { useNutritionState } from "./hooks/useNutritionState";
import type { MealPeriod } from "./services/storageService";

import BarcodeScannerModal from "./components/BarcodeScannerModal";
import OnboardingModal from "./components/OnboardingModal";
import ServerSettings from "./components/ServerSettings";
import {getFavoriteMeals} from "./services/storageService";
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
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-0 select-none">
      <Toaster position="top-center" richColors theme="dark" />

      <div className="relative overflow-hidden w-full max-w-2xl h-[100dvh] bg-background text-foreground">
        <div className="absolute inset-0 overflow-hidden">
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
              const parsed = parseFoodNaturalLanguage(transcript,getFavoriteMeals());
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
          <ServerSettings date={dateKey} entries={entries} close={()=>setShowSettings(false)} setup={()=>{setShowSettings(false);setShowOnboarding(true);}} />
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
