import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("cross-destination UI polish is loaded after the existing compatibility layers", async () => {
  const main = await read("../src/main.jsx");
  const refinement = main.indexOf('import "./ui-experience-2026.css";');
  assert.ok(refinement > main.indexOf('import "./ui-layout-refinement-2026.css";'));
});

test("UI experience polish remains presentation-only and protects feed discovery spacing", async () => {
  const css = await read("../src/ui-experience-2026.css");
  assert.match(css, /Additive visual layer only: no DOM, navigation, data, or API changes/);
  assert.doesNotMatch(css, /feed-header-section|feed-discovery-search|feed-filter-tabs/);
});

test("shared navigation and account surfaces have accessible interaction feedback", async () => {
  const css = await read("../src/ui-experience-2026.css");
  assert.match(css, /:focus-visible/);
  assert.match(css, /\.chatly-primary-nav-item\.is-active/);
  assert.match(css, /\.global-profile-drawer/);
});

test("feed and chat surfaces retain responsive, readable visual treatments", async () => {
  const css = await read("../src/ui-experience-2026.css");
  assert.match(css, /\.feed-page \.post-card/);
  assert.match(css, /\.chat-layout \.message \.bubble/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media \(max-width: 767px\)/);
});

test("explore, search, notifications, profile, and settings receive consistent surface styling", async () => {
  const css = await read("../src/ui-experience-2026.css");
  for (const selector of [
    "explore-category-card",
    "dedicated-search-page",
    "notification-destination-page",
    "profile-page",
    "app-settings-destination-page"
  ]) assert.ok(css.includes(selector), `missing destination polish: ${selector}`);
});

test("motion preferences are respected across the complete app shell", async () => {
  const css = await read("../src/ui-experience-2026.css");
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transition-duration: \.01ms !important/);
});
