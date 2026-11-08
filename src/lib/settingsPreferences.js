export const SETTINGS_PREFERENCE_DEFAULTS = Object.freeze({
  readReceipts: true,
  privateProfile: false,
  messageRequests: true,
  messageAlerts: true,
  activityAlerts: true,
  likesAlerts: true,
  commentAlerts: true,
  mentionAlerts: true,
  enterToSend: false,
  mediaPreview: true,
  autoDownloadMedia: true
});

export const SETTINGS_PREFERENCE_GROUPS = Object.freeze({
  privacy: Object.freeze(["readReceipts", "privateProfile", "messageRequests"]),
  notifications: Object.freeze(["messageAlerts", "activityAlerts", "likesAlerts", "commentAlerts", "mentionAlerts"]),
  chats: Object.freeze(["enterToSend", "mediaPreview", "autoDownloadMedia"])
});

const knownKeys = new Set(Object.keys(SETTINGS_PREFERENCE_DEFAULTS));

/**
 * Return a complete, type-safe preference object without mutating the input.
 * Unknown keys and malformed values are ignored so old device-local settings
 * remain compatible as the settings model evolves.
 */
export function normalizeSettingsPreferences(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const normalized = { ...SETTINGS_PREFERENCE_DEFAULTS };
  for (const key of knownKeys) {
    if (typeof source[key] === "boolean") normalized[key] = source[key];
  }
  return normalized;
}

/** Apply one known boolean preference to a normalized snapshot. */
export function updateSettingsPreference(current, key, value) {
  if (!knownKeys.has(key) || typeof value !== "boolean") {
    return normalizeSettingsPreferences(current);
  }
  return { ...normalizeSettingsPreferences(current), [key]: value };
}

/** Compare snapshots without depending on object key insertion order. */
export function areSettingsPreferencesEqual(left, right) {
  const a = normalizeSettingsPreferences(left);
  const b = normalizeSettingsPreferences(right);
  return [...knownKeys].every(key => a[key] === b[key]);
}
