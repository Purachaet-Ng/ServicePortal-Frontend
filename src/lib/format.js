import { format, formatDistanceToNow, isSameDay, parseISO } from "date-fns";

/**
 * The backend User model is firstname + lastname (API.md says "name", the
 * database disagrees — schema.prisma wins). Every place that shows a person
 * goes through here, so if the model ever collapses to one column this is the
 * only file that changes.
 */
export function fullName(user) {
  if (!user) return "—";
  const name = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
}

/** Two letters for an <Avatar> fallback. */
export function initials(user) {
  if (!user) return "?";
  const first = user.firstname?.[0] ?? user.email?.[0] ?? "?";
  const last = user.lastname?.[0] ?? "";
  return (first + last).toUpperCase();
}

const toDate = (value) =>
  value instanceof Date ? value : typeof value === "string" ? parseISO(value) : null;

export function formatDate(value, pattern = "d MMM yyyy") {
  const date = toDate(value);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(value) {
  return formatDate(value, "d MMM yyyy, HH:mm");
}

export function formatTime(value) {
  return formatDate(value, "HH:mm");
}

/**
 * A booking or event window. Collapses to one date when start and end fall on
 * the same day, which is the common case for a meeting room.
 */
export function formatTimeRange(start, end) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return "—";
  return isSameDay(from, to)
    ? `${format(from, "d MMM yyyy")} · ${format(from, "HH:mm")}–${format(to, "HH:mm")}`
    : `${format(from, "d MMM yyyy HH:mm")} → ${format(to, "d MMM yyyy HH:mm")}`;
}

/** "3 hours ago" — for comment timestamps and activity feeds. */
export function formatRelative(value) {
  const date = toDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}
