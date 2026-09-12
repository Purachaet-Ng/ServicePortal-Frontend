import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  EVENT_STATUS_META,
  INVENTORY_REQUEST_STATUS_META,
  PRIORITY_META,
  RESERVATION_STATUS_META,
  ROLE_META,
  TICKET_STATUS_META,
} from "@/lib/constants";

const REGISTRY = {
  ticket: TICKET_STATUS_META,
  event: EVENT_STATUS_META,
  inventory: INVENTORY_REQUEST_STATUS_META,
  reservation: RESERVATION_STATUS_META,
  role: ROLE_META,
};

/**
 * State, as plain text.
 *
 *   <StatusChip value={ticket.status} />
 *   <StatusChip kind="event" value={event.status} />
 *
 * Not a pill — this is the plain-text form still used by the event and
 * inventory tables, where the colour lives in the claim bar at the row's left
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
 * A tinted pill. Used for roles, for the single status on a detail page, and
 * for ticket and reservation status in their tables — those tables dropped the
 * claim bar when they took the chip, because a bar and a pill say the same
 * thing twice.
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
 * Priority, as a tinted chip. Same shape as StatusPill so the two columns of a
 * ticket row scan as one system, and the tint escalates rather than colouring
 * every row: grey, grey, warm tint, solid signal.
 *
 * Still one encoding, not two — the label carries the meaning and the tint only
 * ranks it, which is what keeps it legal under WCAG 1.4.1.
 */
export function Priority({ value, className }) {
  const meta = PRIORITY_META[value];
  if (!meta) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent font-medium", meta.chip, className)}
    >
      {meta.label}
    </Badge>
  );
}

export default StatusChip;
