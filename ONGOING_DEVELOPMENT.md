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
- Verified:
  - `npm test` passes
  - `npm run typecheck` passes
  - production build succeeds when output is redirected to `/tmp/logical-nutrition-build`
  - production build also succeeds with `vite build --configLoader runner --outDir /tmp/logical-nutrition-build`

## Still To Do

- Run a clean `npm install` after local filesystem permissions are fixed so `package-lock.json` can be fully regenerated and pruned.
- Run normal `npm run build` after permissions are fixed so Vite can write its default temp config and clear/rebuild `dist/`.
- Run `npm run cap:sync` after a successful normal build to refresh Capacitor iOS web assets.
- Decide whether generated folders should remain tracked:
  - `dist/`
  - `ios/App/App/public/`
- Consider extracting shared nutrition math/UI helpers from the screen files once more UI-level tests are in place.
- Consider replacing `localStorage` with a more durable mobile persistence layer, such as Capacitor Preferences or SQLite.
- Strengthen barcode scanner UX and data quality:
  - clearer fallback/medium/high confidence states
- Add UI-level tests for the core logging flow once the UI is split into smaller components.
- Review Apple Health native plugin integration against the actual Capacitor plugin installed in the iOS project.
- Verify camera/barcode scanner behavior on a real iOS device.
- Clean up any unrelated Xcode-generated workspace files before committing, especially:
  - `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/`

## Known Blockers

- Some local files/directories have permission issues. During development, these blocked:
  - updating `node_modules`
  - rewriting `package-lock.json` through npm
  - clearing `dist/assets` during a normal Vite build
  - writing Vite temp config files under `node_modules/.vite-temp`
  - using the default npm cache under `~/.npm`
- Suggested local repair commands:

```bash
sudo chown -R "$USER":staff ~/.npm
sudo chown -R "$USER":staff "/Users/ajbrasil/LogiCal Nutrition Tracker"
chmod -R u+rwX "/Users/ajbrasil/LogiCal Nutrition Tracker"
```

Then rerun:

```bash
cd "/Users/ajbrasil/LogiCal Nutrition Tracker"
npm install
npm run build
npm run cap:sync
```

## Future Agent Notes

- Treat this as an ongoing list. Update this file as part of every substantial development pass.
- Preserve user changes and check `git status` before editing.
- Prefer low-risk refactors that keep behavior stable, especially while splitting `App.tsx`.
- Keep tests focused on nutrition math, date handling, storage migration, barcode confidence, and Apple Health payload correctness.
