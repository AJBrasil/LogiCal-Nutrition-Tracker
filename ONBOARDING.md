# LogiCal Developer Onboarding & Project Guide

Welcome to the **LogiCal Nutrition Tracker** codebase! This document provides everything you need to understand the product vision, architecture, developer workflow, and roadmap.

---

## 1. Product Vision & Principles

LogiCal is designed to be the fastest, most reliable nutrition and macro tracker for iOS and web.

### Core Principles
- **Fast, Utilitarian Logging**: Minimize taps between opening the app and recording a meal.
- **Apple Health First**: Rely on Apple Health for sleep, recovery, workouts, and whole-body metrics rather than building a redundant readiness/fitness score.
- **Lifesum-Inspired UI**: Dark, vibrant, card-based interface with high glanceability:
  - Font pairing: `DM Mono` for numbers and macros; `Inter` for clean typography and labels.
  - Accent colors: Green (`#00D98A` calories), Blue (`#4DA6FF` protein), Amber (`#FFB84D` carbs), Coral (`#FF6B6B` fat).
- **Explicit Anti-Goals (What We DO NOT Build)**:
  - ❌ No social or community feeds.
  - ❌ No recipe discovery, meal planning feeds, or cooking blogs.
  - ❌ No speculative AI meal-photo guessing (prefer concrete barcode lookups or label scanning).

---

## 2. Tech Stack

- **Runtime & Language**: Node.js >= 20, TypeScript 5.8+ (Strict types)
- **Frontend Framework**: React 18, Vite 6
- **Styling**: Tailwind CSS 4 (`@tailwindcss/vite`)
- **Icons & UI Primitives**: `lucide-react`, `sonner` (toasts), Radix UI primitives
- **Native Container**: Capacitor 8 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/haptics`)
- **Testing**: Node.js native test runner (`node --test`) with `--experimental-strip-types` (0 external test framework bloat)

---

## 3. Developer Quickstart

### Prerequisites
- Node.js 20+
- macOS with Xcode (if developing or testing the native iOS container)

### Common Commands

```bash
# 1. Install dependencies
npm install

# 2. Run local web development server (with HMR)
npm run dev

# 3. Run test suite
npm test

# 4. Run TypeScript typecheck
npm run typecheck

# 5. Build for production (outputs to dist/)
npm run build

# 6. Synchronize web assets into Capacitor iOS project
npm run cap:sync

# 7. Open the iOS project in Xcode
npm run cap:open
```

---

## 4. Codebase Architecture

```
/
├── src/
│   ├── main.tsx                         # React entry point
│   ├── app/
│   │   ├── App.tsx                      # App shell & modal orchestration
│   │   ├── types.ts                     # Shared TypeScript interfaces
│   │   ├── hooks/
│   │   │   └── useNutritionState.ts     # Root state orchestration & action handlers
│   │   ├── screens/
│   │   │   ├── DashboardScreen.tsx      # Main daily logging view & macro progress
│   │   │   ├── GoalsScreen.tsx          # Fitness strategy (Cut/Recomp/Bulk) & macro sliders
│   │   │   └── AnalyticsScreen.tsx      # 7-day and 30-day intake trends & averages
│   │   ├── components/
│   │   │   ├── TabBar.tsx               # Fixed bottom navigation
│   │   │   ├── EntryModal.tsx           # Manual & parsed meal entry modal
│   │   │   ├── BarcodeScannerModal.tsx  # Camera feed & barcode search preview
│   │   │   ├── VoiceInputModal.tsx      # Voice draft logging modal
│   │   │   ├── SettingsModal.tsx        # Health sync, demo data, and backups
│   │   │   └── ui/                      # Reusable UI primitives (dialogs, toggles, etc.)
│   │   ├── services/
│   │   │   ├── storageService.ts        # Data persistence & normalization
│   │   │   ├── storageService.test.ts   # Storage migration tests
│   │   │   ├── barcodeService.ts        # Open Food Facts API & confidence scoring
│   │   │   ├── barcodeService.test.ts   # Barcode normalization & cache tests
│   │   │   ├── foodParserService.ts     # Natural language & shorthand macro parser
│   │   │   ├── foodParserService.test.ts # Parser tests
│   │   │   ├── appleHealthService.ts    # HealthKit bridge, Apple Shortcut & CSV export
│   │   │   ├── appleHealthService.test.ts # HealthKit payload tests
│   │   │   └── loggingFlow.test.ts      # Core end-to-end meal logging flow tests
│   │   └── utils/
│   │       ├── nutritionMath.ts         # Pure math helpers (macros, phase calories, clamp)
│   │       └── nutritionMath.test.ts    # Math assertions & boundary tests
│   └── styles/                          # Global CSS and themes
├── ios/                                 # Native Capacitor iOS Xcode workspace
├── capacitor.config.ts                  # Capacitor configuration
├── ONGOING_DEVELOPMENT.md               # Active handoff & task tracker
└── package.json
```

---

## 5. Key Subsystems

### A. Centralized Nutrition Math ([`src/app/utils/nutritionMath.ts`](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/src/app/utils/nutritionMath.ts))
All macro math is isolated into pure functions:
- `calculateMacroCalories(protein, carbs, fat)`: Calculates total kcal via $4\text{ kcal/g}$ (P/C) and $9\text{ kcal/g}$ (F).
- `calculateBasePhaseCalories(phase, weeklyRate)`:
  - **Cut**: $2800 - (\text{weeklyRate} \times 500)$ kcal/day
  - **Recomp**: $2800$ kcal/day
  - **Bulk**: $2800 + (\text{weeklyRate} \times 250)$ kcal/day
- `calculateBalancedProtein(targetCalories, carbs, fat)`: Dynamically computes remaining protein grams when adjusting carbs or fats to keep daily calories balanced.

### B. Barcode Scanner & Confidence Engine ([`src/app/services/barcodeService.ts`](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/src/app/services/barcodeService.ts))
- Fetches product data from Open Food Facts API.
- Assigns confidence tiers:
  - `high`: Verified per-serving nutrition provided by the manufacturer.
  - `medium`: Scaled from 100g product metrics.
  - `fallback`: Known item estimates or editable user fallbacks.
- Verified products are automatically stored in an in-memory cache to prevent redundant network calls during repeated scans.

### C. Apple Health Integration ([`src/app/services/appleHealthService.ts`](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/src/app/services/appleHealthService.ts))
Three-tier export pipeline:
1. **Capacitor Native HealthKit**: Automatically checked via `window.Capacitor.Plugins.CapacitorHealthkit` if a native plugin is compiled into iOS.
2. **Apple Shortcut Deep-Link**: Launches `shortcuts://run-shortcut?name=LogiCal%20Sync` with encoded JSON payloads.
3. **CSV Export**: Generates Apple Health standard CSV files (`exportAppleHealthCSV`) for manual Health import.
*All samples are anchored to 12:00:00 (noon) of the logged date to preserve calendar alignment.*

### D. Data Persistence & Backup ([`src/app/services/storageService.ts`](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/src/app/services/storageService.ts))
- In-memory fast caching for zero UI delay with browser/webview `localStorage` persistence.
- Safe serialization: deep-cloned demo fixtures prevent in-memory mutation bugs; input sanitizers clamp negative values and assign unique collision-resistant IDs.
- Full backup export (`exportAllUserDataJSON()`) and import (`importUserDataJSON()`) for data portability.

---

## 6. What Else Is There To Do? (Roadmap & Next Steps)

Here are the high-value features, optimizations, and validations ready for development:

### 1. In-App User Onboarding (First-Time Experience)
- **Goal**: When a user opens LogiCal for the very first time (no stored data), show a fast, 3-step setup modal:
  1. Select Fitness Goal (`Cut`, `Recomp`, or `Bulk`) and target weekly rate.
  2. Confirm base daily calories and initial macro targets.
  3. Optional Apple Health sync setup prompt.

### 2. Full Backup UI in Settings
- Connect `exportAllUserDataJSON()` and `importUserDataJSON()` in [`SettingsModal.tsx`](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/src/app/components/SettingsModal.tsx):
  - Add **"Export Data Backup (.json)"** button to download a complete backup file.
  - Add **"Import Data Backup (.json)"** file-picker button to restore previous history.

### 3. Physical iOS Device Verification
- **Camera & Barcode Scanner**: Test live camera stream, camera permissions prompt, and barcode recognition on real iOS hardware.
- **Apple Shortcut Execution**: Test the deep-link shortcut flow on a physical iPhone with the Shortcuts app installed.
- **Haptic Feedback**: Verify `@capacitor/haptics` feel on real Taptic Engine hardware.

### 4. Optional Direct Native HealthKit Plugin
- If native background HealthKit writes without Shortcuts are preferred:
  - Add `@capacitor-community/health` (or `capacitor-healthkit`) to `package.json`.
  - Add `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` to `ios/App/App/Info.plist`.
  - Run `npx cap sync ios`.

### 5. Nutrition Label Scanning (OCR / Vision)
- Add a camera-assisted Nutrition Label Scanner as an alternative to barcodes for foods without barcodes (e.g. deli items, meal prep containers). The user scans the nutrition facts panel and the numbers auto-populate into `EntryModal`.

### 6. Quick Meal Templates & Recents
- Allow users to favorite or star frequently eaten meals (e.g. "Morning Protein Shake") for one-tap re-logging.

---

## 7. Guidelines for Contributors & AI Agents

1. **Check Tests First**: Always run `npm test` and `npm run typecheck` before and after making changes.
2. **Preserve User Data**: Ensure data normalization never throws when encountering older or unexpected schema formats.
3. **Keep ONGOING_DEVELOPMENT.md Updated**: Update [ONGOING_DEVELOPMENT.md](file:///Users/ajbrasil/LogiCal%20Nutrition%20Tracker/ONGOING_DEVELOPMENT.md) with every substantial task pass.

