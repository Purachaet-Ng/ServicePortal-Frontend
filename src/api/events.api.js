/**
 * GET    /events                any
 * GET    /events/:id            any
 * POST   /events                ADMIN_DEPT, ADMIN_SYSTEM
 * PATCH  /events/:id            organizer, ADMIN_SYSTEM
 * DELETE /events/:id            organizer, ADMIN_SYSTEM
 * GET    /events/:id/attendees  any
 * POST   /events/:id/rsvp       any    UPSERT — the button toggles, a second click is not an error
 * POST   /events/:id/attendees  organizer, ADMIN_SYSTEM
 *
 * Owner: Person E (PLAN.md §10). Phase 3.
 */
import api from "./client";

export const getEvents = (params) =>
  api.get("/events", { params }).then((r) => r.data);

export const getEvent = (id) => api.get(`/events/${id}`).then((r) => r.data);

export const createEvent = (body) =>
  api.post("/events", body).then((r) => r.data);

export const updateEvent = (id, body) =>
  api.patch(`/events/${id}`, body).then((r) => r.data);

export const deleteEvent = (id) =>
  api.delete(`/events/${id}`).then((r) => r.data);

export const getEventAttendees = (id) =>
  api.get(`/events/${id}/attendees`).then((r) => r.data);

/** body: { rsvpStatus: "going" | "not_going" | "maybe" } */
export const rsvpEvent = (id, body) =>
  api.post(`/events/${id}/rsvp`, body).then((r) => r.data);

/** body: { userIds: number[] } */
export const inviteAttendees = (id, body) =>
  api.post(`/events/${id}/attendees`, body).then((r) => r.data);
