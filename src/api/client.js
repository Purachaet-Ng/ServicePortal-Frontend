/**
 * The single axios instance every *.api.js file imports.
 *
 *   - baseURL from VITE_API_URL, which must end in /api (API.md → Conventions)
 *   - request interceptor attaches `Authorization: Bearer <token>` from the
 *     auth store
 *   - response interceptor flattens the error envelope into a plain Error, so
 *     callers read error.message / error.status / error.errors instead of
 *     digging through error.response.data
 */
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * The backend is mid-build and currently speaks TWO error shapes:
 *
 *   API.md says      { error: { code, message, details: [{field, message}] } }
 *   errorHandler.js  { status: "Error", message, err: [...] }
 *
 * and neither is guaranteed, because errorHandler is not even mounted in
 * app.js yet — an unhandled throw still returns Express`s default HTML. So read
 * both shapes and fall back to a readable sentence. Nothing here has to change
 * when the backend is fixed to match API.md.
 */
function unwrap(data) {
  const envelope = data?.error ?? data;
  return {
    code: envelope?.code,
    message: typeof envelope?.message === "string" ? envelope.message : undefined,
    details: envelope?.details ?? data?.errors ?? data?.err ?? [],
  };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const { code, message, details } = unwrap(error.response?.data);

    // A 401 from /auth/* is a FAILED LOGIN, not an expired session. Logging out
    // there would wipe the form the user is still looking at. Everywhere else,
    // clearing the token IS the redirect: routes/index.jsx swaps to the guest
    // router and auth.store.logout() navigates to /.
    //
    // Note this is 401 only. A 404 — which is what every not-yet-built endpoint
    // returns today, including GET /auth/me — must never log anyone out.
    const isAuthRequest = error.config?.url?.startsWith("/auth/");
    if (status === 401 && !isAuthRequest) {
      useAuthStore.getState().logout();
    }

    const apiError = new Error(
      message ??
        (error.response
          ? "Something went wrong. Please try again."
          : "Cannot reach the server. Please try again."),
    );
    apiError.status = status;
    apiError.code = code;
    /** Per-field validation errors: [{ field, message }] — forms map these
     *  onto inputs with setError() rather than showing a toast. */
    apiError.errors = Array.isArray(details) ? details : [];
    return Promise.reject(apiError);
  },
);

export default api;
