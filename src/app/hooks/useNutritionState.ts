import { useEffect, useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { toast } from "sonner";

import type { ModalMacros, Screen } from "../types";
import {
  FoodEntry,
  HealthSyncSettings,
  Targets,
  deleteEntry,
  formatDateKey,
  getEntriesForDate,
  getHealthSyncSettings,
  getTargets,
  saveEntry,
  saveHealthSyncSettings,
  saveTargets,
} from "../services/storageService";
import { syncToAppleHealth } from "../services/appleHealthService";

export function useNutritionState() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [dateKey, setDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [targets, setTargets] = useState<Targets>(getTargets);
  const [healthSettings, setHealthSettings] = useState<HealthSyncSettings>(getHealthSyncSettings);
  const [showScanner, setShowScanner] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setEntries(getEntriesForDate(dateKey));
  }, [dateKey]);

  const reloadData = () => {
    setEntries(getEntriesForDate(dateKey));
    setTargets(getTargets());
    setHealthSettings(getHealthSyncSettings());
  };

  const moveDate = (dayOffset: number) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + dayOffset);
    setDateKey(formatDateKey(date));
  };

  const handleDeleteEntry = (id: number) => {
    const deleted = deleteEntry(dateKey, id);
    if (!deleted) return;

    setEntries(getEntriesForDate(dateKey));
    toast("Meal deleted", {
      description: deleted.name,
      action: {
        label: "Undo",
        onClick: () => {
          saveEntry(dateKey, deleted);
          setEntries(getEntriesForDate(dateKey));
        },
      },
    });
  };

  const handleLogEntry = (item: ModalMacros) => {
    saveEntry(dateKey, {
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: item.time,
      servingSize: item.servingSize,
    });
    setEntries(getEntriesForDate(dateKey));

    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // ignore haptics outside native containers
    }

    toast.success("Meal Logged", {
      description: `${item.name} (${item.calories} kcal)`,
    });

    if (healthSettings.autoSync) {
      const currentEntries = getEntriesForDate(dateKey);
      syncToAppleHealth(currentEntries, dateKey, healthSettings);
    }
  };

  const handleSaveTargets = (newTargets: Targets) => {
    saveTargets(newTargets);
    setTargets(newTargets);
  };

  const handleUpdateHealthSettings = (settings: HealthSyncSettings) => {
    saveHealthSyncSettings(settings);
    setHealthSettings(settings);
  };

  return {
    screen,
    setScreen,
    dateKey,
    entries,
    targets,
    healthSettings,
    setHealthSettings: handleUpdateHealthSettings,
    showScanner,
    setShowScanner,
    showVoice,
    setShowVoice,
    showSettings,
    setShowSettings,
    reloadData,
    handlePrevDate: () => moveDate(-1),
    handleNextDate: () => moveDate(1),
    handleDeleteEntry,
    handleLogEntry,
    handleSaveTargets,
  };
}
