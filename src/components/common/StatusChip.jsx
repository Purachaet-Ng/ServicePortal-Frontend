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
 * A tinted pill for any status value in the app.
 *
 *   <StatusChip value={ticket.status} />
 *   <StatusChip kind="event" value={event.status} />
 *   <StatusChip kind="role"  value={user.role} />
 *
 * An unknown value renders as plain text rather than crashing — the backend
 * enums can gain a member before the frontend knows about it.
 */
export function StatusChip({ kind = "ticket", value, className }) {
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
 * Priority is a dot plus plain text, deliberately NOT a pill, so it never
 * competes with the status pill in the same table row (STITCH-PROMPTS §00).
 */
export function PriorityDot({ value, className }) {
  const meta = PRIORITY_META[value];
  if (!meta) return <span className="text-muted-foreground">—</span>;

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", meta.text, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default StatusChip;
