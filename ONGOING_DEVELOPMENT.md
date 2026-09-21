# Ongoing Development List

This file is an active handoff document for future agents and developers. Keep it updated whenever work is completed, deferred, blocked, or newly discovered.

## Product Direction

- Keep LogiCal focused on fast, reliable calorie and macro tracking.
- Use Apple Health as the broader health insights layer instead of building a competing whole-body readiness/health score.
- Prioritize excellent logging flows:
  - barcode scanning
  - voice-to-meal draft logging
  - typed quick-add logging
  - manual correction before commit
- Do not add community/social features.
- Do not add recipe discovery, recipe feeds, or meal-plan browsing.
- Do not position the app around AI. Avoid AI meal-photo estimation for now; if photo support is explored, prefer photo-assisted logging or nutrition-label scanning where the user can verify concrete values.
- Borrow from Lifesum's UI feel: friendly, bright, glanceable, card-based, and encouraging, while keeping the feature scope narrower and more utilitarian.

## Completed So Far

- Expanded `.gitignore` to cover dependencies, build output, logs, environment files, OS/editor noise, Xcode generated files, and Capacitor generated public web assets.
- Renamed the package from `@figma/my-make-file` to `logical-nutrition-tracker`.
- Added project scripts:
  - `npm test`
  - `npm run typecheck`
- Removed unused dependency declarations from `package.json` for MUI, Emotion, React DnD, React Router, and React Slick.
- Extracted root application state and data orchestration from `App.tsx` into `src/app/hooks/useNutritionState.ts`.
- Added shared app types in `src/app/types.ts`.
- Added service tests for:
  - food parsing
  - local storage behavior
  - Apple Health payload/date behavior
- Hardened local storage parsing so malformed stored nutrition values are normalized safely.
- Fixed Apple Health native sample timestamps so they are anchored to the selected log date instead of always using the current date/time.
- Added barcode nutrition confidence levels:
  - `high`
  - `medium`
  - `fallback`
- Displayed barcode confidence labels in the scanner preview.
- Updated `vite.config.ts` to use ESM-safe path resolution with `import.meta.url`.
- Extracted `EntryModal` from `App.tsx` into `src/app/components/EntryModal.tsx`.
- Extracted the repeated bottom navigation into `src/app/components/TabBar.tsx`.
- Extracted the main screens from `App.tsx` into:
  - `src/app/screens/DashboardScreen.tsx`
  - `src/app/screens/GoalsScreen.tsx`
  - `src/app/screens/AnalyticsScreen.tsx`
- Reduced `App.tsx` to the root app shell, screen routing, and full-screen modal orchestration.
- Added barcode normalization tests for Open Food Facts serving data, scaled 100g data, local fallback data, and unknown fallback data.
- Fixed barcode normalization so Open Food Facts 100g nutrition is scaled by `serving_quantity` when available.
- Added tested barcode serving helpers for multiplier clamping, gram-to-serving conversion, and scaled calorie/macro totals.
- Updated the barcode scanner preview so users can adjust scanned foods by serving count and, when available, grams before logging.
- Added a local barcode product cache so previously resolved non-fallback products can be reused without another network lookup.
- Added cache tests to ensure verified barcode products are reused and fallback estimates are not cached.
- Clarified barcode confidence states in the scanner preview with distinct labels, colors, and short verification notes.
- Verified:
  - `npm test` passes (31/31 tests)
  - `npm run typecheck` passes with zero errors
  - production build succeeds with `npm run build` directly to `dist/`
  - Capacitor iOS assets sync cleanly via `npx cap sync ios`
- Built native Swift HealthKit Capacitor plugin in `ios/App/App/CapacitorHealthkit.swift` with `App.entitlements`:
  - `requestAuthorization` for dietary calories, protein, carbohydrates, and fat
  - `saveQuantitySample` with sample date anchoring
  - `isAvailable` capability check
- Added Quick Meal Favorites & Recents in `src/app/services/storageService.ts`:
  - Curated default fitness favorites (Protein Shake, Chicken & Rice, Greek Yogurt with Berries, Sirloin Steak, Egg Whites)
  - `getFavoriteMeals`, `saveFavoriteMeal`, `removeFavoriteMeal`, `isFavoriteMeal`, `getRecentMeals`
  - Deduplication and preservation across JSON backup export and import
- Added Quick Add favorites/recents shelf to `src/app/screens/DashboardScreen.tsx` for 1-tap logging pre-fill.
- Added Star favorite toggle to `src/app/components/EntryModal.tsx` to favorite any logged meal on the fly.
- Added unit tests for favorites and recents in `src/app/services/favoritesAndRecents.test.ts`.
- Added developer onboarding guide in `ONBOARDING.md`.
- Completed Nutrition Label Scanner technical investigation & architecture blueprint in `OCR_INVESTIGATION.md` (Apple Vision on-device OCR + FDA regex parser).
- Connected full JSON backup export & restore in `src/app/components/SettingsModal.tsx`.
- Built local-first First-Time User Experience (FTUE / Onboarding) 3-step setup flow:
  - Created `src/app/components/OnboardingModal.tsx`: Lifesum-inspired dark modal covering Goal & Weekly Rate, Macro Split & Lock, and Apple Health / Local-First Launch.
  - Added storage persistence (`isOnboardingCompleted`, `setOnboardingCompleted`, `STORAGE_KEYS.ONBOARDING_COMPLETED`) in `src/app/services/storageService.ts` with backward compatibility for existing users.
  - Added "Re-run Setup Wizard" button in `src/app/components/SettingsModal.tsx` allowing users to recalibrate targets anytime.
  - Added unit test suite `src/app/services/onboarding.test.ts` verifying completion detection, persistence, and reset handling (35/35 tests passing).

## Still To Do

- Verify camera/barcode scanner behavior on a physical iOS device (camera permissions and live video feed).
- Verify native HealthKit permission prompt and sample writing on a physical iOS device.
- Implement Nutrition Label Scanner UI and Swift Vision bridge according to `OCR_INVESTIGATION.md`.

## Known Blockers

- None currently. All builds, tests, type checks, and Capacitor sync succeed.


## Future Agent Notes

- Treat this as an ongoing list. Update this file as part of every substantial development pass.
- Preserve user changes and check `git status` before editing.
- Prefer low-risk refactors that keep behavior stable.
- Keep tests focused on nutrition math, date handling, storage migration, barcode confidence, and Apple Health payload correctness.

