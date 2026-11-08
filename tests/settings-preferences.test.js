import test from "node:test";
import assert from "node:assert/strict";
import {
  SETTINGS_PREFERENCE_DEFAULTS,
  normalizeSettingsPreferences,
  updateSettingsPreference,
  areSettingsPreferencesEqual
} from "../src/lib/settingsPreferences.js";

test("settings preferences normalize missing and malformed snapshots safely", () => {
  assert.deepEqual(normalizeSettingsPreferences(null), { ...SETTINGS_PREFERENCE_DEFAULTS });
  assert.deepEqual(normalizeSettingsPreferences(["bad"]), { ...SETTINGS_PREFERENCE_DEFAULTS });
  assert.deepEqual(normalizeSettingsPreferences({ readReceipts: false, extra: true }), {
    ...SETTINGS_PREFERENCE_DEFAULTS,
    readReceipts: false
  });
});

test("settings preference updates accept only known boolean values", () => {
  const current = { readReceipts: true };
  assert.equal(updateSettingsPreference(current, "readReceipts", false).readReceipts, false);
  assert.equal(updateSettingsPreference(current, "unknown", false).readReceipts, true);
  assert.equal(updateSettingsPreference(current, "readReceipts", "false").readReceipts, true);
  assert.equal(current.readReceipts, true);
});

test("preference snapshots compare by normalized values", () => {
  assert.equal(areSettingsPreferencesEqual({}, { ...SETTINGS_PREFERENCE_DEFAULTS }), true);
  assert.equal(areSettingsPreferencesEqual({ readReceipts: false }, {}), false);
});
