import {useState} from "react";
import EntryModal from "./components/EntryModal";
import type {ModalMacros} from "./types";
import {scaleExtras} from "./services/nutrients";
import FoodsScreen from "./screens/FoodsScreen";
import {saveFavoriteMeal} from "./services/storageService";
import { Toaster } from "sonner";

import { parseFoodNaturalLanguage } from "./services/foodParserService";
import { useNutritionState } from "./hooks/useNutritionState";
import type { MealPeriod } from "./services/storageService";

import BarcodeScannerModal from "./components/BarcodeScannerModal";
import OnboardingModal from "./components/OnboardingModal";
import TabBar from "./components/TabBar";
import ServerSettings from "./components/ServerSettings";
import {getFavoriteMeals} from "./services/storageService";
import VoiceInputModal from "./components/VoiceInputModal";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import GoalsScreen from "./screens/GoalsScreen";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [scanDraft,setScanDraft]=useState<{food:ModalMacros;library:boolean}|null>(null);
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
    <>
      <Toaster position="top-center" richColors theme="dark" />
      <div className="logical-app bg-[#070709]">

      <aside className="desktop-sidebar"><strong>LogiCal</strong>
        <TabBar sidebar activeScreen={screen} onTabChange={s=>{setShowSettings(false);setScreen(s);}}/>
        <button onClick={()=>setShowSettings(true)}>Settings</button>
      </aside>
      <div className="app-content relative overflow-hidden bg-background text-foreground">
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

          {screen==="foods" && <FoodsScreen navigate={setScreen} scan={()=>setShowScanner(true)} log={handleLogEntry}/>}
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
            library={screen==="foods"}
            onLogProduct={food=>setScanDraft({food,library:screen==="foods"})}
          />
        )}

        {scanDraft && <EntryModal library={scanDraft.library} initialData={scanDraft.food} onClose={()=>setScanDraft(null)} onLog={food=>{
          if(scanDraft.library)saveFavoriteMeal(food);else handleLogEntry(food);
          setScanDraft(null);
        }}/>}
        {showVoice && (
          <VoiceInputModal
            onClose={() => setShowVoice(false)}
            onVoiceResult={(transcript) => {
              const parsed = parseFoodNaturalLanguage(transcript,getFavoriteMeals());
              const h = new Date().getHours();
              const period: MealPeriod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
              handleLogEntry({
                ...scaleExtras(parsed),
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
    </>
  );
}
