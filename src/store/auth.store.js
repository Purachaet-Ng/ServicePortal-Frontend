/**
 * Zustand: the logged-in user and the JWT. Persisted to localStorage.
 *
 * This store holds auth ONLY. Server data belongs to TanStack Query — copying
 * tickets or rooms in here is the number one source of stale-UI bugs
 * (WORKFLOW.md §B6).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { queryClient } from "@/lib/queryClient";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      /**
       * Login returns both at once — set them TOGETHER. A render that sees a
       * token but no user has no role, and every permission check silently
       * returns false (WORKFLOW.md §A2).
       */
      setAuth: ({ token, user }) => set({ token, user }),

      /**
       * Refresh just the user, keeping the token. GET /auth/me calls this so a
       * stale persisted role gets corrected without a re-login.
       */
      setUser: (user) => set({ user }),

      /**
       * Clearing the token swaps routes/index.jsx to guestRouter, but it does
       * NOT change the URL — and a router instance created at module load does
       * not re-read window.location when it is swapped in. Log out at
       * /tickets/23 and the guest tree gets asked to render a path it has no
       * route for, which leaves the screen blank.
       *
       * So the redirect is a real navigation, not a router one. It cannot be
       * useNavigate(): this is a store, not a component, and calling a hook out
       * here throws "Invalid hook call" before the app even mounts.
       *
       * assign() is also the better answer on its own merits — a full reload
       * drops every cached query, every mounted component, and anything still
       * held in memory, which is exactly what signing out should do.
       *
       * This runs for expiry too: client.js calls logout() on any non-auth 401,
       * so a session that dies mid-use also lands back on the login page.
       */
      logout: () => {
        queryClient.clear();
        set({ user: null, token: null });
        window.location.assign("/");
      },
    }),
    { name: "serviceportal-auth" },
  ),
);
