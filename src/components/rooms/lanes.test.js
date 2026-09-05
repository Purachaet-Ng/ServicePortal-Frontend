// node --test src/components/rooms/lanes.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignLanes } from "./lanes.js";

const at = (h, m = 0) => new Date(2026, 8, 15, h, m).toISOString();
const booking = (id, from, to) => ({ id, startTime: at(from), endTime: at(to) });

const laneOf = (rows, id) => rows.find((r) => r.booking.id === id).lane;

test("bookings that do not overlap share one lane", () => {
  const rows = assignLanes([booking(1, 9, 10), booking(2, 11, 12)]);
  assert.equal(rows[0].lanes, 1);
  assert.equal(laneOf(rows, 1), 0);
  assert.equal(laneOf(rows, 2), 0);
});

test("back-to-back bookings share a lane, they only touch", () => {
  const rows = assignLanes([booking(1, 10, 11), booking(2, 11, 12)]);
  assert.equal(rows[0].lanes, 1);
});

test("overlapping bookings get their own lanes", () => {
  const rows = assignLanes([booking(1, 9, 11), booking(2, 10, 12)]);
  assert.equal(rows[0].lanes, 2);
  assert.notEqual(laneOf(rows, 1), laneOf(rows, 2));
});

test("three identical bookings stack into three lanes", () => {
  const rows = assignLanes([booking(1, 9, 11), booking(2, 9, 11), booking(3, 9, 11)]);
  assert.equal(rows[0].lanes, 3);
  assert.deepEqual(new Set(rows.map((r) => r.lane)), new Set([0, 1, 2]));
});

test("a freed lane is reused rather than growing the row", () => {
  const rows = assignLanes([
    booking(1, 9, 12), // lane 0 all morning
    booking(2, 9, 10), // lane 1
    booking(3, 10, 11), // lane 1 again — 2 has ended
  ]);
  assert.equal(rows[0].lanes, 2);
  assert.equal(laneOf(rows, 2), laneOf(rows, 3));
});

test("an empty room needs one lane, not zero", () => {
  assert.deepEqual(assignLanes([]), []);
});

test("input order does not matter", () => {
  const forward = assignLanes([booking(1, 9, 11), booking(2, 10, 12)]);
  const reversed = assignLanes([booking(2, 10, 12), booking(1, 9, 11)]);
  assert.equal(laneOf(forward, 1), laneOf(reversed, 1));
  assert.equal(laneOf(forward, 2), laneOf(reversed, 2));
});
