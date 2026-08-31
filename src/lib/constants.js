/**
 * Every enum, label, and lifecycle rule the UI needs — in one file so a typo in
 * a filter cannot silently return an empty list.
 *
 * NEVER type a status or role as a string literal in a component. Import it.
 */

// ---------------------------------------------------------------- list params

/**
 * Radix Select has no "no value" option, so ALL is the sentinel meaning
 * "do not send this param at all". useListQuery strips it out.
 */
export const ALL = "__all__";
export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------- roles

export const ROLES = {
  ADMIN_SYSTEM: "ADMIN_SYSTEM",
  ADMIN_DEPT: "ADMIN_DEPT",
  STAFF: "STAFF",
};

export const ROLE_META = {
  ADMIN_SYSTEM: {
    label: "System Admin",
    className: "bg-foreground/10 text-foreground",
  },
  ADMIN_DEPT: {
    label: "Department Admin",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  STAFF: {
    label: "Staff",
    className: "bg-muted text-muted-foreground",
  },
};

export const ROLE_OPTIONS = Object.keys(ROLE_META).map((value) => ({
  value,
  label: ROLE_META[value].label,
}));

// -------------------------------------------------------------- ticket status

export const TICKET_STATUS = {
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
  REJECTED: "REJECTED",
};

/** Display order for filter dropdowns and grouped views. */
export const TICKET_STATUS_ORDER = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

/**
 * Tinted pill, dark text — never a large filled block (STITCH-PROMPTS §00).
 * These are Tailwind utilities on the stock shadcn palette. Swapping in the
 * OpsPortal hexes later is a change to this object and nothing else.
 */
export const TICKET_STATUS_META = {
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  UNDER_REVIEW: {
    label: "Under review",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300",
  },
  RESOLVED: {
    label: "Resolved",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-muted text-muted-foreground",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export const TICKET_STATUS_OPTIONS = TICKET_STATUS_ORDER.map((value) => ({
  value,
  label: TICKET_STATUS_META[value].label,
}));

// ------------------------------------------------------------------- priority

export const PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
};

export const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "URGENT"];

/**
 * A dot plus plain text, NOT a pill — so priority never competes with the
 * status pill in the same table row (STITCH-PROMPTS §00).
 */
export const PRIORITY_META = {
  LOW: {
    label: "Low",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
  },
  MEDIUM: { label: "Medium", dot: "bg-blue-600", text: "text-foreground" },
  HIGH: { label: "High", dot: "bg-amber-600", text: "text-foreground" },
  URGENT: {
    label: "Urgent",
    dot: "bg-red-600",
    text: "text-red-600 font-semibold",
  },
};

export const PRIORITY_OPTIONS = PRIORITY_ORDER.map((value) => ({
  value,
  label: PRIORITY_META[value].label,
}));

// ------------------------------------------------------------ events, stock

export const EVENT_STATUS_META = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  APPROVE: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300",
  },
  LIVE: {
    label: "Live",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  CLOSED: { label: "Closed", className: "bg-muted text-muted-foreground" },
  CANCEL: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export const INVENTORY_REQUEST_STATUS_META = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  fulfilled: {
    label: "Fulfilled",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

// ---------------------------------------------------------- the state machine

/**
 * The ticket lifecycle from PLAN.md §6, as data.
 *
 * StatusActions.jsx renders one button per allowed entry, so the UI can never
 * offer a transition the backend will reject with 422 INVALID_TRANSITION. When
 * the group changes the lifecycle, this object is the only thing that changes.
 *
 * `orAssignee` and `orCreator` are the row-dependent exceptions that a plain
 * role matrix cannot express — see lib/permissions.js.
 */
export const TICKET_TRANSITIONS = {
  SUBMITTED: [
    {
      to: "UNDER_REVIEW",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      label: "Start review",
    },
    {
      to: "REJECTED",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      label: "Reject",
      variant: "destructive",
    },
  ],
  UNDER_REVIEW: [
    {
      to: "IN_PROGRESS",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      orAssignee: true,
      label: "Start work",
    },
    {
      to: "REJECTED",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      label: "Reject",
      variant: "destructive",
    },
  ],
  IN_PROGRESS: [
    {
      to: "RESOLVED",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      orAssignee: true,
      label: "Mark resolved",
    },
  ],
  RESOLVED: [
    {
      to: "CLOSED",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      orCreator: true,
      label: "Close",
    },
    {
      to: "IN_PROGRESS",
      roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"],
      orCreator: true,
      label: "Reopen",
      variant: "outline",
    },
  ],
  REJECTED: [
    { to: "CLOSED", roles: ["ADMIN_DEPT", "ADMIN_SYSTEM"], label: "Close" },
  ],
  CLOSED: [], // terminal — no transitions out
};

// ---------------------------------------------------------------- form_schema

/** The field types DynamicForm knows how to render (API.md → form_schema). */
export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multiselect",
  "checkbox",
  "user_picker",
];

// ----------------------------------------------------------------- navigation

/** Everyone sees these. The order is fixed by STITCH-PROMPTS §00. */
export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "LayoutDashboard", end: true },
  { to: "/tickets", label: "Tickets", icon: "Ticket" },
  { to: "/rooms", label: "Rooms", icon: "DoorOpen" },
  { to: "/my-bookings", label: "My Bookings", icon: "CalendarCheck" },
  { to: "/inventory", label: "Inventory", icon: "Package" },
  { to: "/events", label: "Events", icon: "CalendarDays" },
];

/**
 * Shown under an "Administration" divider, each filtered by its `action`
 * through usePermission(). Hiding these is cosmetic — ProtectedRoute and the
 * backend are what actually enforce access.
 */
export const ADMIN_NAV_ITEMS = [
  {
    to: "/inventory/requests",
    label: "Approval Queue",
    icon: "ClipboardCheck",
    action: "inventory:approve",
  },
  {
    to: "/admin/department/request-types",
    label: "Request Types",
    icon: "FileSliders",
    action: "requestType:manage",
  },
  {
    to: "/admin/department/team",
    label: "My Team",
    icon: "Users",
    action: "requestType:manage",
  },
  {
    to: "/admin/department/dashboard",
    label: "Dept Dashboard",
    icon: "ChartNoAxesColumn",
    action: "requestType:manage",
  },
  {
    to: "/admin/system/departments",
    label: "Departments",
    icon: "Building2",
    action: "department:manage",
  },
  {
    to: "/admin/system/users",
    label: "All Users",
    icon: "UserCog",
    action: "user:manage",
  },
  {
    to: "/admin/system/rooms",
    label: "Rooms Admin",
    icon: "DoorClosed",
    action: "room:manage",
  },
  {
    to: "/admin/system/inventory-items",
    label: "Inventory Catalog",
    icon: "Boxes",
    action: "inventory:manage",
  },
];
