import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  assigneeId,
  creatorId,
  useTickets,
} from "@/features/tickets/useTickets";
import { useUsers } from "@/features/users/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { TICKET_STATUS, TICKET_STATUS_ORDER } from "@/lib/constants";
import { fullName } from "@/lib/format";

/**
 * The numbers behind both dashboards (WORKFLOW.md §A0).
 *
 * ONE request feeds the counts AND the rows the queue board draws, so a metric
 * can never disagree with the list beneath it — the same discipline the ticket
 * page's tab counts use.
 *
 * The counting happens in the BROWSER. GET /api/tickets filters on status,
 * priority and q only (backend/src/validators/ticket.validator.js), and the
 * questions a dashboard asks — "assigned to me", "submitted with no reviewer" —
 * are about columns that endpoint cannot filter on. What it CAN do is scope:
 * the rows arrive already narrowed by readTicket() to what this role may see,
 * and nothing here widens that.
 *
 * ponytail: limit 100 is MAX_LIMIT (backend/src/utils/query.js), so past 100
 * tickets in scope the counts describe the 100 most recent rather than all of
 * them. `isTruncated` says so out loud instead of showing a confident wrong
 * number. The upgrade is `assigned_to` / `created_by` params on the list query
 * schema, after which each count is a limit:1 request read off meta.total.
 */

/** The backend's ceiling. Asking for more is silently clamped to this. */
const LIMIT = 100;

/** Finished, whatever the route there. Neither is "waiting on someone". */
const TERMINAL = [TICKET_STATUS.CLOSED, TICKET_STATUS.REJECTED];

const isOpen = (ticket) => !TERMINAL.includes(ticket.status);

/** Days shown by the department dashboard's volume bars. */
const VOLUME_DAYS = 14;

/**
 * ponytail: MAX_LIMIT (backend/src/utils/query.js), so a department with more
 * than 100 members shows the first 100. The upgrade is paging the users query,
 * or a workload endpoint that counts on the server.
 */
const USER_LIMIT = 100;

export function useDashboardStats({
  isSystemAdmin = false,
  withTeam = false,
} = {}) {
  const { user } = useAuth();

  const ticketsQuery = useTickets({ limit: LIMIT, sort: "created_at:desc" });

  // GET /users is admin-only; a STAFF user asking would take a 403 for a card
  // they are never shown. Both admins already list only what they may see —
  // ADMIN_DEPT gets their own department (users.service.js roleCondition).
  const usersQuery = useUsers({
    enabled: isSystemAdmin || withTeam,
    limit: USER_LIMIT,
  });

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

    // The `mine != null` guards matter: creatorId/assigneeId return null for a
    // ticket with no creator or no assignee, and `null === null` would count
    // every unassigned ticket as assigned to a user whose id has not loaded
    // yet. Triage does not need an id, so it is not guarded.
    return {
      myOpenTickets: tickets.filter(
        (ticket) => mine != null && creatorId(ticket) === mine && isOpen(ticket),
      ).length,

      assignedToMe: tickets.filter(
        (ticket) => mine != null && assigneeId(ticket) === mine && isOpen(ticket),
      ).length,

      // "No reviewer" is the point of a triage queue — a SUBMITTED ticket that
      // already has an assignee is not waiting for anyone to pick it up.
      awaitingTriage: tickets.filter(
        (ticket) =>
          ticket.status === TICKET_STATUS.SUBMITTED && assigneeId(ticket) == null,
      ).length,

      inProgress: tickets.filter(
        (ticket) => ticket.status === TICKET_STATUS.IN_PROGRESS,
      ).length,

      // Every open ticket nobody owns, not just the submitted ones — work that
      // reached UNDER_REVIEW unassigned is still nobody's.
      unassigned: tickets.filter(
        (ticket) => isOpen(ticket) && assigneeId(ticket) == null,
      ).length,

      open: tickets.filter(isOpen).length,
    };
  }, [tickets, user?.id]);

  /** Every status, in display order, including the ones sitting at zero. */
  const byStatus = useMemo(() => {
    const tally = new Map(TICKET_STATUS_ORDER.map((status) => [status, 0]));
    for (const ticket of tickets) {
      // Only statuses the frontend knows about. A backend enum can gain a
      // member before this file hears of it, and an unknown key would render
      // as a bar with no label.
      if (tally.has(ticket.status)) {
        tally.set(ticket.status, tally.get(ticket.status) + 1);
      }
    }
    return [...tally].map(([status, count]) => ({ status, count }));
  }, [tickets]);

  /**
   * Tickets raised per day over the last fortnight. Built from a fixed run of
   * dates rather than from the tickets, so a quiet day is a zero-height bar and
   * not a missing column — the gap is the information.
   */
  const byDay = useMemo(() => {
    const today = new Date();
    const buckets = new Map(
      Array.from({ length: VOLUME_DAYS }, (_, i) => [
        format(subDays(today, VOLUME_DAYS - 1 - i), "yyyy-MM-dd"),
        0,
      ]),
    );

    for (const ticket of tickets) {
      if (!ticket.createdAt) continue;
      const key = format(parseISO(ticket.createdAt), "yyyy-MM-dd");
      if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
    }

    return [...buckets].map(([date, count]) => ({ date, count }));
  }, [tickets]);

  const openRows = useMemo(() => tickets.filter(isOpen), [tickets]);

  /**
   * Who on the team is carrying work, and who is free.
   *
   * Built from the users list rather than from the tickets, so a member with
   * nothing assigned still gets a row — "nobody is on this" is the answer the
   * page exists to give, and a tickets-first tally would drop exactly those
   * people. Open tickets only: a closed one is not a load on anyone.
   */
  const team = useMemo(() => {
    const members = usersQuery.data;
    if (!members?.length) return [];

    const byAssignee = new Map();
    for (const ticket of openRows) {
      const id = assigneeId(ticket);
      if (id == null) continue;
      const tally = byAssignee.get(id) ?? { open: 0, inProgress: 0 };
      tally.open += 1;
      if (ticket.status === TICKET_STATUS.IN_PROGRESS) tally.inProgress += 1;
      byAssignee.set(id, tally);
    }

    return members
      .map((member) => ({
        ...member,
        ...(byAssignee.get(member.id) ?? { open: 0, inProgress: 0 }),
      }))
      .sort(
        (a, b) => b.open - a.open || fullName(a).localeCompare(fullName(b)),
      );
  }, [usersQuery.data, openRows]);

  const total = ticketsQuery.data?.meta?.total ?? tickets.length;

  return {
    ...counts,
    byStatus,
    byDay,

    /** The fetched rows, for a board that would otherwise refetch them. */
    rows: tickets,
    openRows,

    /** True when the counts describe a window rather than everything. */
    isTruncated: total > tickets.length,
    total,

    activeUsers: usersQuery.data?.length ?? 0,

    /** Every department member with their open-ticket load, busiest first. */
    team,
    idleCount: team.filter((member) => member.open === 0).length,

    tickets: {
      isPending: ticketsQuery.isPending,
      isError: ticketsQuery.isError,
      error: ticketsQuery.error,
      refetch: ticketsQuery.refetch,
    },
    users: {
      // A disabled query never resolves, and rendering it as "still loading"
      // would spin forever on a metric that is not shown anyway.
      isPending: (isSystemAdmin || withTeam) && usersQuery.isPending,
      isError: usersQuery.isError,
      error: usersQuery.error,
    },
  };
}

export default useDashboardStats;
