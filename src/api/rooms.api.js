/**
 * Mounted at /api/reserves (backend app.js):
 *
 * GET    /reserves/rooms                    any            every room
 * GET    /reserves/rooms/bookings           any            ?date=YYYY-MM-DD, every room
 * GET    /reserves/rooms/:id                any
 * GET    /reserves/rooms/:id/bookings       any            ?date=YYYY-MM-DD, one room
 * GET    /reserves/rooms/bookings/:id       any            one booking
 * POST   /reserves/rooms                    ADMIN_SYSTEM   { name, location?, capacity }
 * POST   /reserves/rooms/bookings           any            { roomId, status, startTime, endTime }
 * PATCH  /reserves/rooms/:id                ADMIN_SYSTEM   partial of the above
 * PATCH  /reserves/rooms/bookings/:id       dept/system admin
 * PATCH  /reserves/rooms/bookings/:id/status dept/system admin
 * DELETE /reserves/rooms/:id                ADMIN_SYSTEM
 *
 * NOT built — do not call: list-my-bookings, cancel booking.
 *
 * `status` is REQUIRED on create (room.validator.js) — send "PENDING".
 */
import api from "./client";

export const getRooms = () => api.get("/reserves/rooms").then((r) => r.data);

/**
 * One day of bookings across every room — the availability grid's data.
 * `date` is a plain "YYYY-MM-DD" and is REQUIRED; a datetime is rejected with
 * 400, as is an impossible day like 2026-02-31.
 *
 * REJECTED and CANCELLED bookings are filtered out server-side. PENDING ones
 * are NOT, and must not be — a pending block is occupied space.
 *
 * Each booking carries its `user`, which is what the grid labels the block
 * with. It does NOT carry the room; group by the `roomId` scalar.
 *
 * ponytail: the backend builds the day window in UTC, not in an office
 * timezone — there is no TZ setting anywhere to build one from. The two agree
 * across the 08:00-18:00 band DayGrid draws, so this is not a live defect; see
 * getRoomBookingsByDay in backend/src/services/room.service.js before changing
 * either side.
 */
export const getBookingsByDate = (date) =>
  api.get("/reserves/rooms/bookings", { params: { date } }).then((r) => r.data);

export const createRoom = (body) =>
  api.post("/reserves/rooms", body).then((r) => r.data);

export const updateRoom = (id, body) =>
  api.patch(`/reserves/rooms/${id}`, body).then((r) => r.data);

/**
 * Hard delete. Prisma refuses while the room still has bookings and the
 * controller turns that into a 409 — the database protecting history, not a
 * bug. The page says so in plain English.
 */
export const deleteRoom = (id) =>
  api.delete(`/reserves/rooms/${id}`).then((r) => r.data);

/** body: { roomId, status: "PENDING", startTime, endTime } as ISO strings */
export const createBooking = (body) =>
  api.post("/reserves/rooms/bookings", body).then((r) => r.data);

export const updateBooking = (id, body) =>
  api.patch(`/reserves/rooms/bookings/${id}`, body).then((r) => r.data);

