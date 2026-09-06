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

/**
 * Role IS a pill, unlike ticket status, because a role is a taxonomy rather than
 * a state: it has no claim bar to carry its colour and it never moves through a
 * lifecycle (STITCH-PROMPTS, prompt 14).
 *
 * The three tiers separate by weight and text tone rather than by hue, so they
 * stay quiet next to the status column.
 */
export const ROLE_META = {
  ADMIN_SYSTEM: {
    label: "System admin",
    className: "bg-foreground/10 text-foreground font-medium",
  },
  ADMIN_DEPT: {
    label: "Department admin",
    className: "bg-muted text-foreground",
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
 * Ticket status, in the ServicePortal palette (STITCH-PROMPTS, design direction).
 *
 * Two keys, because status is encoded twice and they do different jobs:
 *
 *   bar        The claim bar: a 3px rule at the row's left edge, encoding whose
 *              move it is in THREE states, not six — signal "needs you", ink
 *              "in flight", rule-grey "settled". Six hues in a 3px sliver is
 *              harder to read than six pills, not easier, and adjacent rows
 *              touch with nothing between them.
 *   className  The status word itself. Always rendered, always beside the bar:
 *              colour is never the only encoding, or this fails WCAG 1.4.1.
 *
 * Everything below is expressed in design tokens rather than raw Tailwind
 * palette colours, so it tracks index.css and adapts to dark mode on its own.
 * The previous version hard-coded bg-blue-100 / bg-teal-100 and would not.
 *
 * NOTE the design retires the pill for ticket status in favour of plain text
 * beside the bar. That is a change in StatusChip.jsx, not here; until then
 * className renders as a tint and reads correctly either way.
 */
export const TICKET_STATUS_META = {
  SUBMITTED: {
    label: "Submitted",
    bar: "bg-signal",
    className: "bg-signal/10 text-signal-text",
  },
  UNDER_REVIEW: {
    label: "Under review",
    bar: "bg-signal",
    className: "bg-signal/10 text-signal-text",
  },
  IN_PROGRESS: {
    label: "In progress",
    bar: "bg-primary",
    className: "bg-muted text-foreground",
  },
  RESOLVED: {
    label: "Resolved",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
  },
  CLOSED: {
    label: "Closed",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
  },
  REJECTED: {
    label: "Rejected",
    bar: "bg-border",
    className: "bg-destructive/10 text-destructive",
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
 * Priority is PLAIN TEXT. "Urgent" carries weight and the signal colour; Low,
 * Medium and High carry nothing at all.
 *
 * This is the encoding the redesign actually removed. A ticket row used to
 * carry a status pill, a priority dot, a role pill and an age column — four
 * things competing inside 44px. The claim bar did not reduce that on its own
 * (bar plus status text is still two encodings, and must be). Retiring the
 * priority dot did: it was already a redundant dot-plus-label pair, and the
 * label alone says everything the dot did.
 *
 * The `dot` key is gone. It survived one step longer than the design because
 * PriorityDot still read it and removing it early would have rendered an
 * unstyled circle; that component is now Priority, and renders text alone.
 */
export const PRIORITY_META = {
  LOW: { label: "Low", text: "text-muted-foreground" },
  MEDIUM: { label: "Medium", text: "text-foreground" },
  HIGH: { label: "High", text: "text-foreground" },
  URGENT: { label: "Urgent", text: "text-signal-text font-semibold" },
};

export const PRIORITY_OPTIONS = PRIORITY_ORDER.map((value) => ({
  value,
  label: PRIORITY_META[value].label,
}));

// ------------------------------------------------------------ events, stock

/** Same three-state logic as tickets: needs you, in flight, settled. */
export const EVENT_STATUS_META = {
  PENDING: {
    label: "Pending",
    bar: "bg-signal",
    className: "bg-signal/10 text-signal-text",
  },
  APPROVE: {
    label: "Approved",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
  },
  IN_PROGRESS: {
    label: "In progress",
    bar: "bg-primary",
    className: "bg-muted text-foreground",
  },
  LIVE: {
    label: "Live",
    bar: "bg-primary",
    className: "bg-muted text-foreground",
  },
  CLOSED: {
    label: "Closed",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
  },
  CANCEL: {
    label: "Cancelled",
    bar: "bg-border",
    className: "bg-destructive/10 text-destructive",
  },
};

export const INVENTORY_REQUEST_STATUS_META = {
  pending: {
    label: "Pending",
    bar: "bg-signal",
    className: "bg-signal/10 text-signal-text",
  },
  approved: {
    label: "Approved",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    bar: "bg-border",
    className: "bg-destructive/10 text-destructive",
  },
  fulfilled: {
    label: "Fulfilled",
    bar: "bg-border",
    className: "bg-muted text-muted-foreground",
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
  { to: "/my-bookings", label: "My bookings", icon: "CalendarCheck" },
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
    label: "Approval queue",
    icon: "ClipboardCheck",
    action: "inventory:approve",
  },
  {
    to: "/admin/department/request-types",
    label: "Request types",
    icon: "FileSliders",
    action: "requestType:manage",
  },
  {
    to: "/admin/department/team",
    label: "My team",
    icon: "Users",
    action: "requestType:manage",
  },
  {
    to: "/admin/department/dashboard",
    label: "Department dashboard",
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
    label: "All users",
    icon: "UserCog",
    action: "user:manage",
  },
  {
    to: "/admin/system/rooms",
    label: "Rooms admin",
    icon: "DoorClosed",
    action: "room:manage",
  },
  {
    to: "/admin/system/inventory-items",
    label: "Inventory catalog",
    icon: "Boxes",
    action: "inventory:manage",
  },
];
