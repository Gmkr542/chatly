import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const profile = await readFile(new URL("../src/components/PublicProfile.jsx", import.meta.url), "utf8");

test("public profile displays the total post count, not only the loaded page", () => {
  assert.match(profile, /const \[postCount, setPostCount\] = useState\(0\)/);
  assert.match(profile, /select\("id,body,created_at", \{ count: "exact" \}\)/);
  assert.match(profile, /setPostCount\(postResult\.count \?\? \(postResult\.data \|\| \[\]\)\.length\)/);
  assert.match(profile, /<b>\{postCount\}<\/b> posts/);
});

test("public profile clears stale counts when the viewed account changes", () => {
  assert.match(profile, /setPosts\(\[\]\); setPostCount\(0\); setFollowers\(0\); setFollowingCount\(0\); setIsFollowing\(false\)/);
});

test("follow interactions remain disabled while loading or saving", () => {
  assert.match(profile, /if \(ownProfile \|\| busy \|\| loading \|\| !person\?\.id \|\| !session\?\.user\?\.id\) return/);
  assert.match(profile, /disabled=\{busy \|\| loading\}/);
});

const settings = await readFile(new URL("../src/components/SettingsDestination.jsx", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("account email settings use a correctly escaped email validation pattern", () => {
  assert.ok(settings.includes(String.raw`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`));
  assert.ok(!settings.includes(String.raw`/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/`));
});

test("settings Manage opens the dedicated Account Center destination", () => {
  assert.match(settings, /aria-label="Open Account Center"/);
  assert.match(settings, /if \(view === "profile"\)/);
  assert.match(settings, /"profile":"Account Center"/);
});

test("account profile and sign-in options navigate to separate destinations", () => {
  assert.match(settings, /setView\("email"\)/);
  assert.match(settings, /setView\("password"\)/);
  assert.match(settings, /if \(view === "email"\)/);
  assert.match(settings, /if \(view === "password"\)/);
});

test("Account Center is the single account destination from settings home", () => {
  assert.match(settings, /id: "profile", title: "Account Center"/);
  assert.match(settings, /if \(view === "profile"\)/);
  assert.doesNotMatch(settings, /if \(view === "account"\)/);
  assert.match(settings, /setView\("profile"\)/);
});

test("Account Center retains sign-in, logout, and account management actions", () => {
  assert.match(settings, /setView\("email"\)/);
  assert.match(settings, /setView\("password"\)/);
  assert.match(settings, /setLogoutOpen\(true\)/);
  assert.match(settings, /Delete account/);
});

test("profile editor opens as a full-screen Account Center destination", () => {
  assert.match(app, /className="modal-backdrop edit-profile-destination"/);
  assert.match(app, /height: "100dvh", maxHeight: "100dvh"/);
  assert.match(app, /aria-label="Back to Account Center"/);
});
