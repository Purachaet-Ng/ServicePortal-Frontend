/**
 * Zustand: local UI state only — nothing here comes from the server.
 *
 * The sidebar open/closed state is owned by shadcn`s SidebarProvider, so it is
 * deliberately NOT duplicated here. This store is for cross-page UI choices
 * that should survive a navigation.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUiStore = create(
  persist(
    (set) => ({
      /** "table" | "card" — the ticket list view toggle. */
      ticketView: "table",
      setTicketView: (ticketView) => set({ ticketView }),

      /** Whether the Administration section of the sidebar is expanded. */
      adminNavOpen: true,
      setAdminNavOpen: (adminNavOpen) => set({ adminNavOpen }),
    }),
    { name: "opsportal-ui" },
  ),
);
