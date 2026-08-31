/**
 * GET    /users          ADMIN_SYSTEM, ADMIN_DEPT   → { users: [...] }
 * GET    /users/:id      ADMIN_SYSTEM, ADMIN_DEPT   → { user }
 * POST   /users          ADMIN_SYSTEM               → 201 { message, user }
 * PATCH  /users/:id      ADMIN_SYSTEM, ADMIN_DEPT   → { message, user }
 * PATCH  /users/:id/role ADMIN_SYSTEM               → { message, user }
 * DELETE /users/:id      ADMIN_SYSTEM               → { message, user }
 *
 * Owner: Person A (PLAN.md §10). MOUNTED AND WORKING — this is the first
 * module past auth to go live, so it is written against the routes as they
 * actually behave, not against API.md. Three differences worth knowing:
 *
 *   1. GET /users returns { users: [...] } — NOT the { data, meta } envelope
 *      API.md defines for lists. It takes no page, limit, sort, or filter
 *      params either: every user comes back in one response, ordered by id.
 *   2. DELETE is a HARD delete (prisma.user.delete), not the soft delete
 *      API.md describes. A user who created a ticket cannot be deleted at all —
 *      the foreign key stops it.
 *   3. PATCH /users/:id/role takes { role } ONLY. Sending departmentId there
 *      is silently dropped by the zod schema; department moves go through
 *      PATCH /users/:id.
 *
 * Fix API.md or the backend and this file follows — but do not "fix" it here by
 * guessing, or the page will break the day someone reads the doc and believes it.
 */
import api from "./client";

/**
 * No params: the endpoint accepts none. Search and role filtering happen in the
 * page, over the rows already delivered — see the note in UsersPage.
 */
export const getUsers = () => api.get("/users").then((r) => r.data);

export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data);

/** body: { firstname, lastname, email, password, phone?, departmentId?, role? } */
export const createUser = (body) =>
  api.post("/users", body).then((r) => r.data);

/** body: { firstname?, lastname?, phone?, departmentId? } — at least one. */
export const updateUser = (id, body) =>
  api.patch(`/users/${id}`, body).then((r) => r.data);

/** body: { role }. Nothing else — see note 3 above. */
export const updateUserRole = (id, body) =>
  api.patch(`/users/${id}/role`, body).then((r) => r.data);

export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);

/**
 * NOT BUILT — there is no /users/assignable route in users.route.js, so this
 * 404s today. It is kept because the ticket detail page needs "who may be an
 * assignee" answered ONCE on the server, and PLAN.md §2 still has the open
 * question of whether STAFF can be assigned tickets at all.
 */
export const getAssignableUsers = (departmentId) =>
  api
    .get("/users/assignable", { params: { department_id: departmentId } })
    .then((r) => r.data);
