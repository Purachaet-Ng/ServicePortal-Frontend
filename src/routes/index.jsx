import { createBrowserRouter, Navigate } from "react-router-dom";

import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import ProtectedRoute from "./ProtectedRoute";
import { useAuthStore } from "@/store/auth.store";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";

import TicketsPage from "@/pages/TicketsPage";
import CreateTicketPage from "@/pages/CreateTicketPage";
import TicketDetailPage from "@/pages/TicketDetailPage";

import RoomsPage from "@/pages/RoomsPage";
import BookRoomPage from "@/pages/BookRoomPage";
import MyBookingsPage from "@/pages/MyBookingsPage";

import InventoryPage from "@/pages/InventoryPage";
import RequestItemPage from "@/pages/RequestItemPage";
import InventoryRequestsPage from "@/pages/InventoryRequestsPage";

import EventsPage from "@/pages/EventsPage";
import CreateEventPage from "@/pages/CreateEventPage";
import EventDetailPage from "@/pages/EventDetailPage";

import DepartmentsPage from "@/pages/admin/DepartmentsPage";
import UsersPage from "@/pages/admin/UsersPage";
import RoomsAdminPage from "@/pages/admin/RoomsAdminPage";
import InventoryItemsPage from "@/pages/admin/InventoryItemsPage";
import RequestTypesPage from "@/pages/admin/RequestTypesPage";
import TeamPage from "@/pages/admin/TeamPage";
import DeptDashboardPage from "@/pages/admin/DeptDashboardPage";

import ForbiddenPage from "@/pages/ForbiddenPage";
import NotFoundPage from "@/pages/NotFoundPage";

/** The one role set used by more than one gate. */
const DEPT_ADMINS = ["ADMIN_DEPT", "ADMIN_SYSTEM"];

const guestRouter = createBrowserRouter([
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, Component: LoginPage },
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
    ],
  },
  // The catch-all matters: logging out at /tickets/23 swaps the router but does
  // NOT change the URL, so without this the guest tree is asked to render a
  // path it has no route for and the screen goes blank.
  { path: "*", element: <Navigate to="/" replace /> },
]);

const userRouter = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "profile", Component: ProfilePage },

      // Ticketing — Phase 1. Open to everyone; the BACKEND scopes the rows.
      // STAFF sees their own, ADMIN_DEPT the department queue, ADMIN_SYSTEM
      // all — from the same GET /api/tickets. Never filter by role here.
      { path: "tickets", Component: TicketsPage },
      { path: "tickets/new", Component: CreateTicketPage },
      { path: "tickets/:id", Component: TicketDetailPage },

      // Room booking — Phase 1
      { path: "rooms", Component: RoomsPage },
      { path: "rooms/:id/book", Component: BookRoomPage },
      { path: "my-bookings", Component: MyBookingsPage },

      // Inventory — Phase 2
      { path: "inventory", Component: InventoryPage },
      { path: "inventory/:id/request", Component: RequestItemPage },
      {
        element: <ProtectedRoute action="inventory:approve" />,
        children: [
          { path: "inventory/requests", Component: InventoryRequestsPage },
        ],
      },

      // Events — Phase 3
      { path: "events", Component: EventsPage },
      { path: "events/:id", Component: EventDetailPage },
      {
        element: <ProtectedRoute action="event:manage" />,
        children: [{ path: "events/new", Component: CreateEventPage }],
      },

      // One gate over every department-admin screen.
      {
        element: <ProtectedRoute roles={DEPT_ADMINS} />,
        children: [
          { path: "admin/department/request-types", Component: RequestTypesPage },
          { path: "admin/department/team", Component: TeamPage },
          { path: "admin/department/dashboard", Component: DeptDashboardPage },
        ],
      },

      // Master data — platform owner only.
      {
        element: <ProtectedRoute roles={["ADMIN_SYSTEM"]} />,
        children: [
          { path: "admin/system/departments", Component: DepartmentsPage },
          { path: "admin/system/users", Component: UsersPage },
          { path: "admin/system/rooms", Component: RoomsAdminPage },
          { path: "admin/system/inventory-items", Component: InventoryItemsPage },
        ],
      },

      { path: "403", Component: ForbiddenPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);

/**
 * The router itself is swapped by the token, not by a loading flag
 * (WORKFLOW.md §A1). No token means the protected tree does not exist at all,
 * so there is no window in which a guest can render a protected page.
 */
export function useAppRouter() {
  const token = useAuthStore((state) => state.token);
  return token ? userRouter : guestRouter;
}
