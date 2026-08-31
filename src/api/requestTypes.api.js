/**
 * GET    /departments/:deptId/request-types   any                        THE endpoint that drives the dynamic form
 * POST   /departments/:deptId/request-types   ADMIN_DEPT (own), ADMIN_SYSTEM
 * GET    /request-types/:id                   any                        one type WITH its form_schema
 * PATCH  /request-types/:id                   ADMIN_DEPT (own), ADMIN_SYSTEM
 * DELETE /request-types/:id                   ADMIN_DEPT (own), ADMIN_SYSTEM   409 REQUEST_TYPE_IN_USE
 *
 * Owner: Person B (PLAN.md §10). Not mounted yet.
 *
 * "own dept" is enforced server-side by comparing req.user.departmentId to
 * requestType.departmentId. The UI hides the controls as a courtesy only.
 */
import api from "./client";

export const getRequestTypes = (departmentId) =>
  api.get(`/departments/${departmentId}/request-types`).then((r) => r.data);

export const getRequestType = (id) =>
  api.get(`/request-types/${id}`).then((r) => r.data);

/** body: { name, description, formSchema, defaultAssigneeId } */
export const createRequestType = (departmentId, body) =>
  api
    .post(`/departments/${departmentId}/request-types`, body)
    .then((r) => r.data);

export const updateRequestType = (id, body) =>
  api.patch(`/request-types/${id}`, body).then((r) => r.data);

export const deleteRequestType = (id) =>
  api.delete(`/request-types/${id}`).then((r) => r.data);
