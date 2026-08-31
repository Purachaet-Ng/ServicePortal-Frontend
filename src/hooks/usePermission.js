import { useCallback } from "react";
import { can } from "@/lib/permissions";
import { useAuth } from "./useAuth";

/**
 * `can(action)` for the current user, backed by the matrix in lib/permissions.js.
 *
 * This decides what to RENDER. It is not access control — the backend returns
 * 401/403 regardless of what the UI shows, and that is the real boundary. A
 * hidden button is a courtesy, not a lock (WORKFLOW.md §B5).
 *
 *   const { can } = usePermission();
 *   {can("ticket:assign") && <AssignButton />}
 */
export function usePermission() {
  const { role, departmentId } = useAuth();

  const canFn = useCallback((action) => can(role, action), [role]);

  /**
   * The row-dependent half of the check: ADMIN_DEPT may only touch records in
   * their OWN department. ADMIN_SYSTEM is unscoped. Pass the record`s
   * departmentId — a record with none (a room, say) is not department-scoped.
   */
  const canInDepartment = useCallback(
    (recordDepartmentId) => {
      if (role === "ADMIN_SYSTEM") return true;
      if (role !== "ADMIN_DEPT") return false;
      return departmentId != null && departmentId === recordDepartmentId;
    },
    [role, departmentId],
  );

  return { can: canFn, canInDepartment, role };
}
