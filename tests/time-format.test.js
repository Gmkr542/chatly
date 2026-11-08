import test from "node:test";
import assert from "node:assert/strict";
import { formatChatTime, formatChatDateTime } from "../src/lib/timeFormat.js";

test("chat message times always use 12-hour AM/PM notation", () => {
  assert.equal(formatChatTime(new Date(2026, 0, 1, 0, 5)), "12:05 AM");
  assert.equal(formatChatTime(new Date(2026, 0, 1, 9, 7)), "9:07 AM");
  assert.equal(formatChatTime(new Date(2026, 0, 1, 12, 0)), "12:00 PM");
  assert.equal(formatChatTime(new Date(2026, 0, 1, 14, 30)), "2:30 PM");
  assert.equal(formatChatTime(new Date(2026, 0, 1, 23, 59)), "11:59 PM");
});

test("chat timestamp details also use 12-hour notation", () => {
  assert.match(formatChatDateTime(new Date(2026, 0, 1, 14, 30)), /2:30 PM/);
});

test("invalid chat timestamps return safe fallback labels", () => {
  assert.equal(formatChatTime("not-a-date"), "Time unavailable");
  assert.equal(formatChatDateTime("not-a-date"), "Invalid message timestamp");
});
