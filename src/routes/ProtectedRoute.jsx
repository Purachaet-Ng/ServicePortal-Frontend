import { Outlet } from "react-router-dom";
import { can } from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import ForbiddenPage from "@/pages/ForbiddenPage";

/**
 * Gate a group of routes by role or by permission action.
 *
 *   <ProtectedRoute roles={["ADMIN_SYSTEM"]} />
 *   <ProtectedRoute action="inventory:approve" />
 *
 * Wrong role renders the 403 page — it does NOT redirect. The user should see
 * WHY they cannot get in; a silent bounce to the dashboard reads as a bug.
 *
 * These checks mirror the backend`s requireRole middleware. They exist so the
 * user gets a clean message instead of a broken screen; the enforcement itself
 * is server-side.
 */
export function ProtectedRoute({ roles, action }) {
  const { user } = useAuth();

  if (!user) return <ForbiddenPage />;

  const allowed = roles ? roles.includes(user.role) : can(user.role, action);

  return allowed ? <Outlet /> : <ForbiddenPage />;
}

export default ProtectedRoute;
