/**
 * Mounted at /api/reserves (backend app.js). Only these five exist:
 *
 * GET    /reserves/rooms                any
 * GET    /reserves/rooms/bookings       any            ?date=YYYY-MM-DD
 * POST   /reserves/rooms                any            { name, location?, capacity }
 * PATCH  /reserves/rooms/:id            any            partial of the above
 * POST   /reserves/rooms/bookings       any            { roomId, status, startTime, endTime }
 * PATCH  /reserves/rooms/bookings/:id   any            partial of the above
 *
 * NOT built yet — do not call: GET /rooms/:id, DELETE /rooms/:id,
 * list-my-bookings, cancel booking.
 *
 * `status` is REQUIRED on create (room.validator.js) — send "PENDING".
 * None of these routes is role-gated; reserve.route.js only authenticates.
 */
import api from "./client";

export const getRooms = () => api.get("/reserves/rooms").then((r) => r.data);

/**
 * One day of bookings across every room — the availability grid's data.
 * `date` is a plain "YYYY-MM-DD"; the backend builds the day window in the
 * office timezone, so do NOT send a datetime.
 *
 * REJECTED and CANCELLED bookings are already filtered out server-side.
 * PENDING ones are NOT — a pending block is occupied space.
 */
export const getBookingsByDate = (date) =>
  api.get("/reserves/rooms/bookings", { params: { date } }).then((r) => r.data);

export const createRoom = (body) =>
  api.post("/reserves/rooms", body).then((r) => r.data);

export const updateRoom = (id, body) =>
  api.patch(`/reserves/rooms/${id}`, body).then((r) => r.data);

/** body: { roomId, status: "PENDING", startTime, endTime } as ISO strings */
export const createBooking = (body) =>
  api.post("/reserves/rooms/bookings", body).then((r) => r.data);

export const updateBooking = (id, body) =>
  api.patch(`/reserves/rooms/bookings/${id}`, body).then((r) => r.data);

