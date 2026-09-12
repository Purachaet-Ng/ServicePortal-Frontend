/**
 * GET    /events                any
 * GET    /events/:id            any
 * POST   /events                ADMIN_DEPT, ADMIN_SYSTEM
 * PATCH  /events/:id            organizer, ADMIN_SYSTEM
 * DELETE /events/:id            organizer, ADMIN_SYSTEM
 * GET    /events/:id/attendees  organizer, ADMIN_SYSTEM
 * GET    /events/:id/qr         accepted attendee
 * POST   /events/:id/check-in   organizer, ADMIN_SYSTEM
 * POST   /events/:id/rsvp       invited attendee
 * POST   /events/:id/attendees  organizer, ADMIN_SYSTEM
 *
 * Owner: Person E (PLAN.md §10). Phase 3.
 */
import api from "./client";

export const getEvents = (params) =>
  api.get("/events", { params }).then((r) => r.data);

export const getEvent = (id) => api.get(`/events/${id}`).then((r) => r.data);

export const getEventInvitees = (departmentId) => api.get("/events/invitees", {
      params: { department_id: departmentId },
    })
    .then((r) => r.data);

export const createEvent = (body) =>
  api.post("/events", body).then((r) => r.data);

export const updateEvent = (id, body) =>
  api.patch(`/events/${id}`, body).then((r) => r.data);

export const cancelEvent = (id) =>
  api.patch(`/events/${id}/cancel`).then((r) => r.data);

export const deleteEvent = (id) =>
  api.delete(`/events/${id}`).then((r) => r.data);

export const getEventAttendees = (id) =>
  api.get(`/events/${id}/attendees`).then((r) => r.data);

export const getEventQr = (id) =>
  api.get(`/events/${id}/qr`).then((r) => r.data);

/** body: { token } or { userId } */
export const checkInEvent = (id, body) =>
  api.post(`/events/${id}/check-in`, body).then((r) => r.data);

/** body: { rsvpStatus: "ACCEPTED" | "DECLINED" } */
export const rsvpEvent = (id, body) =>
  api.post(`/events/${id}/rsvp`, body).then((r) => r.data);

/** body: { userIds: number[] } */
export const inviteAttendees = (id, body) =>
  api.post(`/events/${id}/attendees`, body).then((r) => r.data);
