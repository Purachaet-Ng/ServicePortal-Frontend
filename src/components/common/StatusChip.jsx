import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EVENT_STATUS_META,
  INVENTORY_REQUEST_STATUS_META,
  PRIORITY_META,
  ROLE_META,
  TICKET_STATUS_META,
} from "@/lib/constants";

const REGISTRY = {
  ticket: TICKET_STATUS_META,
  event: EVENT_STATUS_META,
  inventory: INVENTORY_REQUEST_STATUS_META,
  role: ROLE_META,
};

/**
 * State, as plain text.
 *
 *   <StatusChip value={ticket.status} />
 *   <StatusChip kind="event" value={event.status} />
 *
 * Not a pill. On a board the colour lives in the claim bar at the row's left
 * edge (see DataTable's `rowAccent`), and this word is what actually states the
 * state — which is what keeps the bar legal under WCAG 1.4.1. Rendering both a
 * coloured bar and a coloured pill would put the same information on the row
 * twice and leave the reader deciding which one to read.
 *
 * `kind="role"` is routed to StatusPill instead: a role is a taxonomy, not a
 * state, so it has no claim bar to carry its colour and nothing to be redundant
 * with (STITCH-PROMPTS, prompt 14).
 *
 * An unknown value renders as its raw string rather than crashing — the backend
 * enums can gain a member before the frontend knows about it.
 */
export function StatusChip({ kind = "ticket", value, className }) {
  if (kind === "role") {
    return <StatusPill kind={kind} value={value} className={className} />;
  }

  const meta = REGISTRY[kind]?.[value];

  return (
    <span className={cn("text-sm", className)}>
      {meta?.label ?? value ?? "—"}
    </span>
  );
}

/**
 * A tinted pill. Kept for roles, and for the single status on a detail page
 * where there is no row and therefore no claim bar to carry the colour.
 */
export function StatusPill({ kind = "role", value, className }) {
  const meta = REGISTRY[kind]?.[value];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent font-medium",
        meta?.className ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {meta?.label ?? value ?? "—"}
    </Badge>
  );
}

/**
 * Priority, as plain text. "Urgent" carries weight and the signal colour; Low,
 * Medium and High carry nothing.
 *
 * This replaces the old PriorityDot. The dot was a redundant second encoding of
 * a label that already said everything the dot did, and it was the thing
 * actually competing with status in a 44px row — so it is the encoding the
 * redesign removed, rather than the status word (STITCH-PROMPTS, claim bar).
 */
export function Priority({ value, className }) {
  const meta = PRIORITY_META[value];
  if (!meta) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={cn("text-sm", meta.text, className)}>{meta.label}</span>
  );
}

export default StatusChip;
