import test from "node:test";
import assert from "node:assert/strict";

import {
  isOnboardingCompleted,
  setOnboardingCompleted,
  resetAllData,
  DEFAULT_TARGETS,
  saveTargets,
} from "./storageService.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

test("onboarding: returns false for a brand new user with no targets saved", () => {
  storage.clear();
  assert.equal(isOnboardingCompleted(), false);
});

test("onboarding: returns true for existing users with targets already in storage", () => {
  storage.clear();
  saveTargets({ ...DEFAULT_TARGETS, calories: 2500 });
  // Even if logical_onboarding_completed is not explicitly set, existing targets treat user as onboarded
  assert.equal(isOnboardingCompleted(), true);
});

test("onboarding: sets and reads explicit onboarding completion status", () => {
  storage.clear();
  setOnboardingCompleted(true);
  assert.equal(isOnboardingCompleted(), true);

  setOnboardingCompleted(false);
  assert.equal(isOnboardingCompleted(), false);
});

test("onboarding: resetAllData clears onboarding completion", () => {
  storage.clear();
  setOnboardingCompleted(true);
  assert.equal(isOnboardingCompleted(), true);

  resetAllData();
  assert.equal(isOnboardingCompleted(), false);
});
