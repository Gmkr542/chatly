import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("home global header joins the search and feed-filter section without an outer gap", async () => {
  const css = await read("../src/ui-layout-refinement-2026.css");
  assert.match(css, /\.app-main-column > \.topbar \+ \.feed-page\s*\{[^}]*padding-top:\s*0/);
  assert.match(css, /\.feed-header-section\s*\{[^}]*background:\s*var\(--surface/);
  assert.match(css, /\.feed-header-section\s*\{[^}]*border-bottom:/);
  assert.match(css, /\.feed-header-section\s*\{[^}]*gap:\s*14px/);
  assert.match(css, /\.feed-filter-tabs\s*\{[^}]*padding-inline:\s*0/);
});

test("home header keeps search and filter spacing while remaining edge-to-edge on mobile", async () => {
  const css = await read("../src/ui-layout-refinement-2026.css");
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.feed-header-section\s*\{[^}]*gap:\s*12px/);
  assert.match(css, /\.feed-header-section\s*\{[^}]*margin-inline:\s*-10px/);
  assert.match(css, /\.feed-discovery-search\s*\{[^}]*min-height:\s*44px/);
});

test("account drawer prioritizes Search before Explore and Chats", async () => {
  const app = await read("../src/App.jsx");
  const profile = app.indexOf(">Profile</button>");
  const search = app.indexOf(">Search</button>");
  const explore = app.indexOf(">Explore</button>");
  const chats = app.indexOf(">Chats</button>");
  assert.ok(profile >= 0 && search > profile && explore > search && chats > explore);
});

test("layout refinement stylesheet loads after existing compatibility overrides", async () => {
  const main = await read("../src/main.jsx");
  assert.ok(main.indexOf('import "./ui-layout-refinement-2026.css";') > main.indexOf('import "./feed-scroll-fix.css";'));
});
