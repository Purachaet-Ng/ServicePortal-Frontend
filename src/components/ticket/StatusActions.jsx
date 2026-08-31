import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TICKET_TRANSITIONS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

/**
 * The status buttons on the ticket detail page, DERIVED from the transition
 * table rather than hardcoded per screen (WORKFLOW.md §A5).
 *
 * Two things fall out of this for free:
 *   - the UI can never offer a move the backend will reject with
 *     422 INVALID_TRANSITION
 *   - when the group changes the lifecycle, lib/constants.js is the only file
 *     that changes
 *
 * CLOSED has no entries, so a closed ticket renders no buttons at all.
 */
export function isTransitionAllowed(transition, ticket, user) {
  if (!user) return false;
  if (transition.roles?.includes(user.role)) return true;
  // The row-dependent exceptions a role matrix cannot express.
  if (transition.orAssignee && ticket?.assignedToId === user.id) return true;
  if (transition.orCreator && ticket?.createdById === user.id) return true;
  return false;
}

export function StatusActions({ ticket, onTransition, isPending }) {
  const { user } = useAuth();

  const allowed = (TICKET_TRANSITIONS[ticket?.status] ?? []).filter(
    (transition) => isTransitionAllowed(transition, ticket, user),
  );

  if (allowed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((transition) => (
        <Button
          key={transition.to}
          variant={transition.variant ?? "default"}
          size="sm"
          disabled={isPending}
          onClick={() => onTransition(transition.to)}
        >
          {isPending && <Spinner />}
          {transition.label}
        </Button>
      ))}
    </div>
  );
}

export default StatusActions;
