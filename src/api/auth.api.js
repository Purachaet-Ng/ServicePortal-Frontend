/**
 * POST   /auth/register   public   → { message, user }   (backend: implemented)
 * POST   /auth/login      public   → { token, user }     (backend: implemented)
 * GET    /auth/me         any      → user                (backend: NOT BUILT — 404s today)
 * POST   /auth/logout     any      → 204                 (backend: NOT BUILT)
 *
 * /auth/me is called on app load to refresh a persisted user whose role may be
 * stale (WORKFLOW.md §A1). Until the endpoint exists it 404s, which useMe()
 * swallows — client.js only logs out on 401, so the session survives.
 */
import api from "./client";

export const register = (body) =>
  api.post("/auth/register", body).then((r) => r.data);

export const login = (body) =>
  api.post("/auth/login", body).then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

export const logout = () => api.post("/auth/logout").then((r) => r.data);
