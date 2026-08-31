/**
 * GET    /departments        any           populates the first dropdown on /tickets/new
 * GET    /departments/:id    any
 * POST   /departments        ADMIN_SYSTEM
 * PATCH  /departments/:id    ADMIN_SYSTEM
 * DELETE /departments/:id    ADMIN_SYSTEM
 *
 * Owner: Person B (PLAN.md §10). Not mounted yet.
 */
import api from "./client";

export const getDepartments = (params) =>
  api.get("/departments", { params }).then((r) => r.data);

export const getDepartment = (id) =>
  api.get(`/departments/${id}`).then((r) => r.data);

export const createDepartment = (body) =>
  api.post("/departments", body).then((r) => r.data);

export const updateDepartment = (id, body) =>
  api.patch(`/departments/${id}`, body).then((r) => r.data);

export const deleteDepartment = (id) =>
  api.delete(`/departments/${id}`).then((r) => r.data);
