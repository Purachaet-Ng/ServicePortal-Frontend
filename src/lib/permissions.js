/**
 * What each role may DO, from WORKFLOW.md §B5.
 *
 * This decides what to RENDER. It is not access control — the backend returns
 * 401/403 no matter what the UI shows, and that is the real boundary. A hidden
 * button is a courtesy, not a lock.
 *
 * Two checks live OUTSIDE this matrix because they depend on the row, not just
 * the role:
 *   - ADMIN_DEPT may only manage their OWN department — compare
 *     user.departmentId to the record's departmentId at the call site.
 *   - Some ticket transitions are open to the assignee or the creator whatever
 *     their role — that is orAssignee / orCreator in TICKET_TRANSITIONS.
 */
export const PERMISSIONS = {
  "ticket:triage": ["ADMIN_DEPT", "ADMIN_SYSTEM"],
  "ticket:assign": ["ADMIN_DEPT", "ADMIN_SYSTEM"],
  "requestType:manage": ["ADMIN_DEPT", "ADMIN_SYSTEM"],
  "department:manage": ["ADMIN_SYSTEM"],
  "user:manage": ["ADMIN_SYSTEM"],
  "room:manage": ["ADMIN_SYSTEM"],
  "inventory:manage": ["ADMIN_SYSTEM"],
  "inventory:approve": ["ADMIN_DEPT", "ADMIN_SYSTEM"],
  "event:manage": ["ADMIN_DEPT", "ADMIN_SYSTEM"],
};

export function can(role, action) {
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return role != null && allowed.includes(role);
}
