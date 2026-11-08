import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL("../src/components/SettingsDestination.jsx", import.meta.url),
  "utf8"
);
const css = readFileSync(
  new URL("../src/components/SettingsDestination.css", import.meta.url),
  "utf8"
);

test("private profile uses a draft and an explicit save action", () => {
  assert.match(component, /const \[privacyDraft, setPrivacyDraft\] = useState\(false\)/);
  assert.match(component, /Save privacy settings/);
  assert.match(component, /privacyDraft === serverPrivateProfile/);
  assert.match(component, /setPrivacyDraft\(!!profileResult\.data\?\.is_private\)/);
});

test("settings destinations expose notification, chat and appearance controls", () => {
  for (const label of ["COMMUNITY ACTIVITY", "COMPOSING MESSAGES", "TEXT & PREVIEW", "Restore default appearance"]) {
    assert.ok(component.includes(label), `Missing settings control: ${label}`);
  }
  assert.match(component, /setStoredJSON\("chatly-chat-prefs"/);
});

test("dialogs can be dismissed with Escape and explicit buttons", () => {
  assert.match(component, /if \(event\.key === "Escape"\)/);
  assert.match(component, /setResetDialog\(""\)/);
  assert.match(component, /Log out of Chatly\?/);
});

test("settings cards and switches remain responsive and touch friendly", () => {
  assert.match(css, /\.st-card\s*\{[^}]*height:auto;[^}]*max-height:none;[^}]*overflow:visible/s);
  assert.match(css, /width:46px; height:27px/);
  assert.match(css, /@media \(max-width:600px\)/);
  assert.match(css, /\.st-privacy-save/);
  assert.match(css, /\.st-appearance-preview/);
});
