/**
 * GET    /notifications               any    the dropdown list, loaded only when it opens
 * GET    /notifications/unread-count  any    the badge — polled once a minute
 * PATCH  /notifications/:id/read      owner
 * PATCH  /notifications/read-all      any
 *
 * Owner: Person E (PLAN.md §10). Phase 2.
 *
 * Polling every 60s is the right call for a class project. socket.io is in the
 * backend dependencies but real-time is a Phase 3 nice-to-have, not a
 * requirement (WORKFLOW.md §A9).
 */
import api from "./client";

export const getNotifications = (params) =>
  api.get("/notifications", { params }).then((r) => r.data);

export const getUnreadCount = () =>
  api.get("/notifications/unread-count").then((r) => r.data);

export const markRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((r) => r.data);

export const markAllRead = () =>
  api.patch("/notifications/read-all").then((r) => r.data);
