import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/components/SettingsDestination.css", import.meta.url),
  "utf8"
);
const component = readFileSync(
  new URL("../src/components/SettingsDestination.jsx", import.meta.url),
  "utf8"
);

test("settings cards use natural content height and do not clip their content", () => {
  assert.match(css, /\.st-card\s*\{[^}]*height:auto;[^}]*max-height:none;[^}]*overflow:visible/s);
});

test("settings layout has a consolidated responsive stylesheet", () => {
  assert.equal((css.match(/@media\s*\(max-width:\s*600px\)/g) || []).length, 1);
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.st-settings\s*\{/);
  assert.match(css, /\.st-subheader\s*\{/);
});

test("preference toggles have consistent touch-sized switch controls", () => {
  assert.match(css, /\.st-pref-row input\[type="checkbox"\][\s\S]*?width:46px; height:27px/);
  assert.match(css, /\.st-pref-row input\[type="checkbox"\]:checked::before/);
  assert.match(component, /className="st-pref-row"/);
});

test("settings retains privacy, follow request, messaging, and account sections", () => {
  for (const label of ["ACCOUNT PRIVACY", "FOLLOW REQUESTS", "MESSAGING PRIVACY", "SECURITY & SIGN-IN"]) {
    assert.ok(component.includes(label), `Missing settings section: ${label}`);
  }
});
