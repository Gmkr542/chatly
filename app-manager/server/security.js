import { createHmac, timingSafeEqual } from "node:crypto";

/** Compare untrusted strings without leaking their matching prefix. */
export function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Parse cookies defensively; malformed percent-encoding is ignored, never thrown. */
export function parseCookies(header = "") {
  const parsed = Object.create(null);
  if (typeof header !== "string") return parsed;
  for (const segment of header.split(";")) {
    const item = segment.trim();
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    const name = item.slice(0, separator).trim();
    const rawValue = item.slice(separator + 1).trim();
    if (!name || Object.hasOwn(parsed, name)) continue;
    try {
      parsed[name] = decodeURIComponent(rawValue);
    } catch {
      // Ignore only the malformed cookie; continue parsing the rest.
    }
  }
  return parsed;
}

/** Verify a signed OAuth state cookie using a constant-time signature comparison. */
export function verifySignedState(cookieValue, returnedState, secret) {
  if (typeof cookieValue !== "string" || typeof returnedState !== "string" || typeof secret !== "string" || !secret) return false;
  const separator = cookieValue.lastIndexOf(".");
  if (separator <= 0) return false;
  const state = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (!state || !signature || !constantTimeEqual(state, returnedState)) return false;
  const expected = createHmac("sha256", secret).update(state).digest("base64url");
  return constantTimeEqual(expected, signature);
}
