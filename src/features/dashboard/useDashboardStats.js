import { useMemo } from "react";
import { useTickets } from "@/features/tickets/useTickets";
import { useUsers } from "@/features/users/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { TICKET_STATUS } from "@/lib/constants";

/**
 * The counts behind the dashboard cards (WORKFLOW.md §A0).
 *
 * Everything here is COUNTED IN THE BROWSER over lists the endpoints already
 * return whole. That is the right shape for a dashboard against this backend:
 * neither GET /tickets nor GET /users accepts a filter, so asking the server
 * for "how many are SUBMITTED" is not currently possible, and four separate
 * count endpoints would be worse than one list either way.
 *
 * The rows are already scoped by role before they arrive — readTicket decides
 * what a STAFF user versus an ADMIN_DEPT can see. This only counts what the
 * user was already sent; it never widens it.
 */

/** Finished, whatever the route there. Neither is "waiting on someone". */
const TERMINAL = [TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED];

const isOpen = (ticket) => !TERMINAL.includes(ticket.status);

/**
 * The list includes both the scalar (createdById) and the relation object
 * (createdBy). Read the scalar first and fall back, so a change to the Prisma
 * `include` in ticket.service.js cannot silently turn every count into zero.
 */
const creatorId = (ticket) => ticket.createdById ?? ticket.createdBy?.id ?? null;
const assigneeId = (ticket) => ticket.assignedToId ?? ticket.assignedTo?.id ?? null;

export function useDashboardStats({ isSystemAdmin = false } = {}) {
  const { user } = useAuth();

  const ticketsQuery = useTickets();

  // GET /users is admin-only; a STAFF user asking would take a 403 for a card
  // they are never shown.
  const usersQuery = useUsers({ enabled: isSystemAdmin });

  /**
   * useTickets has no `select` yet, so the { tickets: [...] } envelope is
   * unwrapped here. When the tickets endpoint is fixed and that unwrapping
   * moves into the hook where it belongs, this line becomes `ticketsQuery.data`.
   */
  const tickets = useMemo(() => {
    const raw = ticketsQuery.data;
    return raw?.tickets ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  }, [ticketsQuery.data]);

  const counts = useMemo(() => {
    const mine = user?.id ?? null;

    return {
      myOpenTickets: tickets.filter(
        (ticket) => creatorId(ticket) === mine && isOpen(ticket),
      ).length,

      assignedToMe: tickets.filter(
        (ticket) => assigneeId(ticket) === mine && isOpen(ticket),
      ).length,

      // "No reviewer" is the point of a triage queue — a SUBMITTED ticket that
      // already has an assignee is not waiting for anyone to pick it up.
      awaitingTriage: tickets.filter(
        (ticket) =>
          ticket.status === TICKET_STATUS.SUBMITTED && assigneeId(ticket) == null,
      ).length,
    };
  }, [tickets, user?.id]);

  return {
    ...counts,
    activeUsers: usersQuery.data?.length ?? 0,

    tickets: {
      isPending: ticketsQuery.isPending,
      isError: ticketsQuery.isError,
      error: ticketsQuery.error,
    },
    users: {
      // A disabled query never resolves, and rendering it as "still loading"
      // would spin forever on a card that is not shown anyway.
      isPending: isSystemAdmin && usersQuery.isPending,
      isError: usersQuery.isError,
      error: usersQuery.error,
    },
  };
}

export default useDashboardStats;
