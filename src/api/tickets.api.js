/**
 * GET    /tickets               any    backend scopes the rows by role — never filter client-side
 * GET    /tickets/:id           any    scoped; 403 if out of scope
 * POST   /tickets               any    validates custom_fields against form_schema → 422 with per-field details
 * PATCH  /tickets/:id           see the transition table in PLAN.md §6
 * GET    /tickets/:id/comments  any    scoped
 * POST   /tickets/:id/comments  any    scoped
 *
 * Owner: Person C (PLAN.md §10). None of these routes are mounted yet.
 *
 * No try/catch here — client.js already flattens errors into error.message,
 * error.status, and error.errors.
 */
import api from "./client";

export const getTickets = (params) =>
  api.get("/tickets", { params }).then((r) => r.data);

export const getTicket = (id) => api.get(`/tickets/${id}`).then((r) => r.data);

/**
 * body: { request_type_id, title, description, priority, custom_fields }
 * NEVER send department_id — the backend derives it from the request type
 * (PLAN.md §5). Sending it would make "HR department, IT request type"
 * expressible, which is exactly what the schema prevents.
 */
export const createTicket = (body) =>
  api.post("/tickets", body).then((r) => r.data);

/** body: { status } | { priority } | { assignedToId } */
export const updateTicket = (id, body) =>
  api.patch(`/tickets/${id}`, body).then((r) => r.data);

export const getTicketComments = (id) =>
  api.get(`/tickets/${id}/comments`).then((r) => r.data);

/** body: { text }. entity_type and entity_id are set by the backend. */
export const addTicketComment = (id, body) =>
  api.post(`/tickets/${id}/comments`, body).then((r) => r.data);
