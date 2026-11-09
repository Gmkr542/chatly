import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("desktop shell uses one centered content column instead of an empty sidebar grid", async () => {
  const css = await read("../src/ui-shell-polish-2026.css");
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 760px\)/);
  assert.match(css, /justify-content:\s*center/);
  assert.doesNotMatch(css, /grid-template-columns:\s*248px minmax\(0, 640px\)/);
});

test("destination changes reset the viewport to the top", async () => {
  const app = await read("../src/App.jsx");
  assert.match(app, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(app, /\}, \[tab\]\)/);
});

test("YouTube discovery limits short queries and caches successful results", async () => {
  const source = await read("../src/components/explore/useYouTubeSearch.js");
  assert.match(source, /normalizedQuery\.length < 2/);
  assert.match(source, /CACHE_TTL_MS = 5 \* 60 \* 1000/);
  assert.match(source, /MAX_CACHE_ENTRIES = 50/);
  assert.match(source, /cacheSearch\(cacheKey, validVideos\)/);
  assert.match(source, /AbortController/);
});
