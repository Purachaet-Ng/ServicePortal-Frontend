/**
 * GET    /inventory/items              any
 * GET    /inventory/items/:id          any
 * POST   /inventory/items              ADMIN_SYSTEM
 * PATCH  /inventory/items/:id          ADMIN_SYSTEM
 * DELETE /inventory/items/:id          ADMIN_SYSTEM
 * GET    /inventory/requests           any (scoped) — the approval queue for admins
 * POST   /inventory/items/:id/requests any            409 INSUFFICIENT_STOCK
 * PATCH  /inventory/requests/:id       ADMIN_DEPT, ADMIN_SYSTEM
 *
 * Owner: Person E (PLAN.md §10). Phase 2 — the two Prisma models do not exist
 * yet either (PLAN.md §4).
 *
 * On approval, invalidate BOTH ["inventory","requests"] and
 * ["inventory","items"] — approving changes stock, so a stale catalog would
 * keep showing the old count (WORKFLOW.md §A8).
 */
import api from "./client";

export const getInventoryItems = (params) =>
  api.get("/inventory/items", { params }).then((r) => r.data);

export const getInventoryItem = (id) =>
  api.get(`/inventory/items/${id}`).then((r) => r.data);

export const createInventoryItem = (body) =>
  api.post("/inventory/items", body).then((r) => r.data);

export const updateInventoryItem = (id, body) =>
  api.patch(`/inventory/items/${id}`, body).then((r) => r.data);

export const deleteInventoryItem = (id) =>
  api.delete(`/inventory/items/${id}`).then((r) => r.data);

export const getInventoryRequests = (params) =>
  api.get("/inventory/requests", { params }).then((r) => r.data);

/** body: { quantity, reason } */
export const createInventoryRequest = (itemId, body) =>
  api.post(`/inventory/items/${itemId}/requests`, body).then((r) => r.data);

/** body: { status: "approved" | "rejected" | "fulfilled" } */
export const updateInventoryRequest = (id, body) =>
  api.patch(`/inventory/requests/${id}`, body).then((r) => r.data);
