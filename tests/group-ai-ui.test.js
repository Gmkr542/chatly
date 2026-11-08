import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../src/components/GroupAIInsights.jsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/components/GroupAIInsights.css", import.meta.url), "utf8");

test("group AI UI clearly communicates unanimous opt-in and provider processing", () => {
  assert.match(component, /every current member opts in/);
  assert.match(component, /latest 80 messages are sent to the configured AI provider/);
  assert.match(component, /New members must opt in separately/);
});

test("AI generation is disabled until every member has consented", () => {
  assert.match(component, /disabled=\{!state\?\.allConsented/);
  assert.match(component, /Chatly cannot enable consent for someone else/);
});

test("results are presented as transient insights, not saved group records", () => {
  assert.match(component, /Not saved/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /max-width:480px/);
});
