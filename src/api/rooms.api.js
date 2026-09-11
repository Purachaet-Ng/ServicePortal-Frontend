/**
 * Mounted at /api/reserves (backend app.js):
 *
 * GET    /reserves/rooms                    any            every room
 * GET    /reserves/rooms/bookings           any            ?date=YYYY-MM-DD, every room
 * GET    /reserves/rooms/:id                any
 * GET    /reserves/rooms/:id/bookings       any            ?date=YYYY-MM-DD, one room
 * GET    /reserves/rooms/bookings/:id       any            one booking
 * POST   /reserves/rooms                    ADMIN_SYSTEM   { name, location?, capacity }
 * POST   /reserves/rooms/bookings           any            { roomId, status, startTime, endTime, purpose? }
 * PATCH  /reserves/rooms/:id                ADMIN_SYSTEM   partial of the above
 * PATCH  /reserves/rooms/bookings/:id       dept/system admin
 * PATCH  /reserves/rooms/bookings/:id/status dept/system admin  { status, rejectionReason? }
 * PATCH  /reserves/rooms/bookings/:id/cancel any            OWNER only
 * DELETE /reserves/rooms/:id                ADMIN_SYSTEM
 *
 * The combined list lives in bookings.api.js — GET /reserves/bookings/mine.
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

/** One room, for the booking page's header. */
export const getRoom = (id) =>
  api.get(`/reserves/rooms/${id}`).then((r) => r.data);

/**
 * One room's bookings for one day — what the booking form shows as already
 * taken. `date` is a plain "YYYY-MM-DD" and is REQUIRED; dayQuerySchema rejects
 * a datetime and an impossible day alike.
 *
 * Same deny-list as the whole-day read: REJECTED and CANCELLED are dropped
 * server-side, PENDING is not and must not be.
 */
export const getRoomBookings = (id, date) =>
  api
    .get(`/reserves/rooms/${id}/bookings`, { params: { date } })
    .then((r) => r.data);

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

/** body: { roomId, status: "PENDING", startTime, endTime, purpose? } — times as ISO strings */
export const createBooking = (body) =>
  api.post("/reserves/rooms/bookings", body).then((r) => r.data);

export const updateBooking = (id, body) =>
  api.patch(`/reserves/rooms/bookings/${id}`, body).then((r) => r.data);


/**
 * One booking, with its room, its requester and whoever settled it.
 *
 * The relations arrive with it — getRoomBookingById includes them — so the
 * detail page does NOT need a second call to useRoom() to learn the room's
 * name. Do not add one back.
 *
 * 404 when the id does not exist. That is an answer, not a failure to retry:
 * the page says so and offers a way back rather than looping.
 */
export const getRoomBooking = (id) =>
  api.get(`/reserves/rooms/bookings/${id}`).then((r) => r.data);

/**
 * The owner withdraws their own request. No body — this route can only ever
 * write CANCELLED.
 *
 * 403 when the booking is not yours, 409 when it is already settled. Both are
 * real answers the UI shows; neither is a bug.
 */
export const cancelRoomBooking = (id) =>
  api.patch(`/reserves/rooms/bookings/${id}/cancel`).then((r) => r.data);

/**
 * Admin approve / reject. body: { status, rejectionReason? }
 *
 * `rejectionReason` is REQUIRED by the server when status is "REJECTED" — a
 * refusal with no explanation comes back 400, not silently accepted. Approving
 * ignores it, and the server clears any reason left over from an earlier
 * rejection.
 */
export const setRoomBookingStatus = (id, status, rejectionReason) =>
  api
    .patch(`/reserves/rooms/bookings/${id}/status`, { status, rejectionReason })
    .then((r) => r.data);
