/**
 * Mounted at /api/reserves (backend app.js):
 *
 * GET    /reserves/cars                     any            every car
 * GET    /reserves/cars/:id                 any
 * GET    /reserves/cars/:id/availability    any            ?date=YYYY-MM, one car
 * GET    /reserves/cars/bookings/:id        any            one booking
 * POST   /reserves/cars                     ADMIN_SYSTEM   { name, plate, seats, location? }
 * POST   /reserves/cars/bookings            any            { carId, status, startTime, endTime, purpose? }
 * PATCH  /reserves/cars/:id                 ADMIN_SYSTEM   partial of the above
 * PATCH  /reserves/cars/bookings/:id        dept/system admin
 * PATCH  /reserves/cars/bookings/:id/status dept/system admin  { status, rejectionReason? }
 * PATCH  /reserves/cars/bookings/:id/cancel any            OWNER only
 * DELETE /reserves/cars/:id                 ADMIN_SYSTEM
 *
 * The combined list lives in bookings.api.js — GET /reserves/bookings/mine.
 *
 * `status` is REQUIRED on create (car.validator.js) — send "PENDING". The
 * service ignores it and every booking starts PENDING, exactly like rooms.
 */
import api from "./client";

export const getCars = () => api.get("/reserves/cars").then((r) => r.data);

/**
 * One car's bookings. `month` is "YYYY-MM" — a MONTH, not a day.
 *
 * ponytail: the endpoint is named `availability` and its param is named `date`,
 * but getCarbookingByDay() in backend/src/services/car.service.js builds its
 * window with `new Date(`${month}-01T00:00:00`)`. Pass a "YYYY-MM-DD" and that
 * is `new Date("2026-09-08-01T00:00:00")` — an Invalid Date, which Prisma
 * rejects and errorHandler turns into a 500. The route does not zod-validate
 * the query either, so an omitted param fails the same way. Always send YYYY-MM.
 *
 * Fixing the backend to take a day would mean changing this call and
 * useCarMonthBookings together. It is not obviously worth it: a month per
 * request is what makes stepping through days free.
 *
 * The rows are raw car_bookings — no `user` relation (so the grid labels them
 * "Booked"), and REJECTED / CANCELLED are NOT filtered out server-side the way
 * the rooms endpoint filters them. CarsPage drops those.
 */
export const getCarAvailability = (id, month) =>
  api
    .get(`/reserves/cars/${id}/availability`, { params: { date: month } })
    .then((r) => r.data);

/** One car, for the booking page's header. */
export const getCar = (id) =>
  api.get(`/reserves/cars/${id}`).then((r) => r.data);

export const createCar = (body) =>
  api.post("/reserves/cars", body).then((r) => r.data);

export const updateCar = (id, body) =>
  api.patch(`/reserves/cars/${id}`, body).then((r) => r.data);

/**
 * Hard delete. Prisma refuses while the car still has bookings and the
 * controller turns that into a 409 — the database protecting history, not a
 * bug. The page says so in plain English.
 */
export const deleteCar = (id) =>
  api.delete(`/reserves/cars/${id}`).then((r) => r.data);

/** body: { carId, status: "PENDING", startTime, endTime, purpose? } — times as ISO strings */
export const createBooking = (body) =>
  api.post("/reserves/cars/bookings", body).then((r) => r.data);

/**
 * One booking, with its car, its requester and whoever settled it — same
 * include as the room twin, so BookingDetailPage reads one shape.
 */
export const getCarBooking = (id) =>
  api.get(`/reserves/cars/bookings/${id}`).then((r) => r.data);

/** Owner cancel. 403 if it is not yours, 409 if it is already settled. */
export const cancelCarBooking = (id) =>
  api.patch(`/reserves/cars/bookings/${id}/cancel`).then((r) => r.data);

/**
 * Admin approve / reject. body: { status, rejectionReason? }
 *
 * `rejectionReason` is REQUIRED by the server when status is "REJECTED" — a
 * refusal with no explanation comes back 400, not silently accepted. Approving
 * ignores it, and the server clears any reason left over from an earlier
 * rejection.
 */
export const setCarBookingStatus = (id, status, rejectionReason) =>
  api
    .patch(`/reserves/cars/bookings/${id}/status`, { status, rejectionReason })
    .then((r) => r.data);
