/**
 * Mounted at /api/reserves (backend app.js):
 *
 * GET /reserves/bookings/mine     any            rooms AND cars you have claimed
 * GET /reserves/bookings/pending  dept/system    everything awaiting approval
 *
 * The only read in the reserve module that crosses both resources. Everything
 * else is per-room or per-car and lives in rooms.api.js / cars.api.js — as do
 * the two by-id reads and the two cancels, because those are room and car
 * routes and each api file mirrors its own slice of the route table.
 *
 * Neither route takes a `userId`. The token is the filter on /mine, and /pending
 * is gated by role — so there is no way to ask for one named person's list.
 */
import api from "./client";

/**
 * Every booking you have made, newest first, flattened so one table can render
 * both kinds of row:
 *
 *   type       "room" | "car" — REQUIRED to build a link, because booking ids
 *              are only unique within their own table. Room booking 88 and car
 *              booking 88 both exist.
 *   resource   the room or the car itself, under one key rather than two.
 *
 * REJECTED and CANCELLED bookings are INCLUDED here, unlike every availability
 * read, which drops them. This is a history: "an admin rejected that" is one of
 * the things the page exists to tell you.
 */
export const getMyBookings = () =>
  api.get("/reserves/bookings/mine").then((r) => r.data);

/**
 * The approval queue — every PENDING booking, longest wait first.
 *
 * Sorted by createdAt on the server, so the order IS the queue. Not scoped by
 * department: a room belongs to nobody, and PATCH .../status has no department
 * check either.
 */
export const getPendingBookings = () =>
  api.get("/reserves/bookings/pending").then((r) => r.data);
