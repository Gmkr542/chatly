import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { constantTimeEqual, parseCookies, verifySignedState } from "./security.js";

test("constantTimeEqual accepts equal strings and rejects mismatches", () => {
  assert.equal(constantTimeEqual("same", "same"), true);
  assert.equal(constantTimeEqual("same", "samf"), false);
  assert.equal(constantTimeEqual("a", "longer"), false);
  assert.equal(constantTimeEqual(null, "x"), false);
});

test("parseCookies safely ignores malformed values and continues", () => {
  const parsed = parseCookies("broken=%E0%A4%A; session=valid%20value; duplicate=first; duplicate=second");
  assert.equal(parsed.broken, undefined);
  assert.equal(parsed.session, "valid value");
  assert.equal(parsed.duplicate, "first");
  assert.doesNotThrow(() => parseCookies("%%%"));
});

test("verifySignedState validates state and signature", () => {
  const secret = "unit-test-secret";
  const state = "random-state-value";
  const signature = createHmac("sha256", secret).update(state).digest("base64url");
  assert.equal(verifySignedState(state + "." + signature, state, secret), true);
  assert.equal(verifySignedState(state + "." + signature, "other-state", secret), false);
  assert.equal(verifySignedState(state + ".bad-signature", state, secret), false);
  assert.equal(verifySignedState(null, state, secret), false);
});
