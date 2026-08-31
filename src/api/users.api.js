/**
 * GET    /users                          ADMIN_DEPT (own dept), ADMIN_SYSTEM
 * PATCH  /users/:id/role                 ADMIN_SYSTEM
 * DELETE /users/:id                      ADMIN_SYSTEM   soft delete — tickets reference created_by
 * GET    /users/assignable?department_id ADMIN_DEPT, ADMIN_SYSTEM
 *
 * Owner: Person A (PLAN.md §10). Not mounted yet.
 *
 * /users/assignable exists so "who may be an assignee" is decided ONCE, on the
 * server. See the open question in PLAN.md §2 — whether STAFF can be assigned
 * tickets is still undecided by the group.
 */
import api from "./client";

export const getUsers = (params) =>
  api.get("/users", { params }).then((r) => r.data);

export const getAssignableUsers = (departmentId) =>
  api
    .get("/users/assignable", { params: { department_id: departmentId } })
    .then((r) => r.data);

/** body: { role, departmentId } */
export const updateUserRole = (id, body) =>
  api.patch(`/users/${id}/role`, body).then((r) => r.data);

export const deactivateUser = (id) =>
  api.delete(`/users/${id}`).then((r) => r.data);
