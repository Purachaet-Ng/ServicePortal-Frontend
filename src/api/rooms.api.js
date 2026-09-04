/**
 * GET    /rooms                    any            filter by capacity, location
 * GET    /rooms/:id                any
 * POST   /rooms                    ADMIN_SYSTEM
 * PATCH  /rooms/:id                ADMIN_SYSTEM
 * DELETE /rooms/:id                ADMIN_SYSTEM
 * GET    /rooms/:id/availability   any            ?date=YYYY-MM-DD — day view of existing bookings
 * GET    /bookings                 any            scoped: my bookings
 * POST   /rooms/:id/bookings       any            409 ROOM_UNAVAILABLE / 422 INVALID_TIME_RANGE
 * DELETE /bookings/:id             owner, ADMIN_SYSTEM
 *
 * Owner: Person D (PLAN.md §10). Not mounted yet.
 *
 * The availability view is a COURTESY, not a lock — two people can pick the
 * same slot in the same second and only the backend can settle it. Always
 * handle the 409 (WORKFLOW.md §A7).
 */
import api from "./client";

export const getRooms = (params) =>
  api.get("/rooms", { params }).then((r) => r.data);

export const getRoom = (id) => api.get(`/rooms/${id}`).then((r) => r.data);

export const createRoom = (body) => api.post("/rooms", body).then((r) => r.data);

export const updateRoom = (id, body) =>
  api.patch(`/reserve/rooms/${id}`, body).then((r) => r.data);

export const deleteRoom = (id) =>
  api.delete(`/reserve/rooms/${id}`).then((r) => r.data);

/** date: "YYYY-MM-DD" */
export const getRoomAvailability = (id, date) =>
  api.get(`/reserve/rooms/${id}/availability`, { params: { date } }).then((r) => r.data);

export const getBookings = (params) =>
  api.get("/reserve/rooms/bookings", { params }).then((r) => r.data);

/** body: { startTime, endTime } as ISO strings */
export const createBooking = (roomId, body) =>
  api.post(`/reserve/rooms/${roomId}/bookings`, body).then((r) => r.data);

export const cancelBooking = (id) =>
  api.delete(`/reserve/bookings/${id}`).then((r) => r.data);
