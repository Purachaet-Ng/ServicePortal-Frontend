import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/PageHeader";
import MetricRow, { Metric } from "@/components/common/MetricRow";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import StatusChip, { Priority } from "@/components/common/StatusChip";
import { useDashboardStats } from "@/features/dashboard/useDashboardStats";
import { useNotifications } from "@/features/notifications/useNotifications";
import { usePermission } from "@/hooks/usePermission";
import { formatAge, formatRelative } from "@/lib/format";
import { TICKET_STATUS_META } from "@/lib/constants";

/**
 * ONE dashboard component, three shapes (WORKFLOW.md §A0).
 *
 * Do not build StaffDashboard.jsx / AdminDashboard.jsx as separate routes —
 * this file reads usePermission() and renders the panels the current role is
 * allowed to see. Same route, same file, different metrics.
 *
 * The layout is STITCH-PROMPTS prompt 03: a card-less metric row over a rule,
 * then 65/35. There are no cards on this page at all, because a card means one
 * record and nothing here is one — the metrics are readings and the queue is a
 * board. Sections are separated by rules, never by more boxes.
 *
 * Two panels the prompt draws are absent, and deliberately. "Resolved this
 * week" and "Average response" need a resolution timestamp; model Ticket has
 * createdAt and updatedAt only. "Your next bookings" needs a list-my-bookings
 * endpoint; the reserve module exposes availability per room per day and
 * nothing else. Neither is stubbed — an empty box teaches the reader nothing
 * that this comment does not.
 */

/** How many queue rows fit above the fold beside the activity rail. */
const QUEUE_ROWS = 6;

/** 16px semibold, with an optional text link on its right (prompt 03). */
function SectionHeading({ children, action }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/**
 * The right rail. Notifications are the closest thing the backend has to an
 * activity feed — already scoped to the token's user, already written as
 * sentences about what happened.
 *
 * The bell passes enabled:false until its menu opens; this passes different
 * params, so the two are separate cache entries and neither fights the other.
 *
 * Its own four states, sized for a 35% column: ErrorState and ListEmptyState
 * are py-16 and would leave the rail taller than the board beside it.
 */
function RecentActivity() {
  const {
    data: notifications = [],
    isPending,
    isError,
    error,
    refetch,
  } = useNotifications({ limit: 5 });

  return (
    <section>
      <SectionHeading>Recent activity</SectionHeading>

      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {error?.message ?? "Could not load activity."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <p className="border-t pt-4 text-sm text-muted-foreground">
          Nothing has happened yet. Assignments, comments and status changes
          show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t">
          {notifications.map((notification) => (
            <li key={notification.id} className="py-3">
              <p className="text-[13px] leading-snug">{notification.message}</p>
              <p className="pt-0.5 text-xs text-muted-foreground">
                {formatRelative(notification.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { can } = usePermission();

  const isDeptAdmin = can("ticket:triage");
  const isSystemAdmin = can("department:manage");

  const stats = useDashboardStats({ isSystemAdmin });

  /**
   * The queue. An admin reads it oldest first — the longest-waiting ticket is
   * the triage question, and "what has been sitting here since Tuesday" is the
   * one thing a newest-first list hides. Staff read their own work newest
   * first, which is the order the hook already fetched.
   */
  const queue = useMemo(() => {
    const rows = stats.openRows;
    const ordered = isDeptAdmin ? [...rows].reverse() : rows;
    return ordered.slice(0, QUEUE_ROWS);
  }, [stats.openRows, isDeptAdmin]);

  // Rebuilt only when the columns actually change — TanStack Table resets its
  // internal state when the array identity changes on every render.
  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Ticket",
        // Request type rides on the second line rather than taking a column of
        // its own, the same way the ticket list does it. Prompt 03 draws it as
        // a fifth column, but that prompt is a 1440px screen and this board
        // lives in 65% of the content area — at which width a fifth column
        // puts the whole table into a horizontal scroll, and a board that
        // scrolls sideways under five rows reads as broken.
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              #{row.original.id}
              {row.original.requestType?.name
                ? `, ${row.original.requestType.name}`
                : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <Priority value={row.original.priority} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusChip value={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Age",
        // Compact, not a sentence: five columns share this row, and the
        // sentence form is what pushes the board into a horizontal scroll.
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatAge(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const newTicketButton = (
    <Button asChild>
      <Link to="/tickets/new">
        <Plus className="size-4" />
        New ticket
      </Link>
    </Button>
  );

  const { isPending, isError, error, refetch } = stats.tickets;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          isSystemAdmin
            ? "Org-wide activity across every department."
            : isDeptAdmin
              ? "Your department queue and what is waiting on you."
              : "Your open requests and what is waiting on you."
        }
      >
        {newTicketButton}
      </PageHeader>

      {/* Exactly one metric per shape carries the signal colour: the thing a
          person has to act on. A signal that fires on every metric is not a
          signal. For an admin that is the triage backlog; for staff, their own
          assigned work, since they have no queue to triage. */}
      <MetricRow>
        <Metric
          label="My open tickets"
          value={stats.myOpenTickets}
          caption="Raised by you, not yet closed"
          isPending={isPending}
          isError={isError}
        />
        <Metric
          label="Assigned to me"
          value={stats.assignedToMe}
          caption="Waiting on your action"
          tone={!isDeptAdmin && stats.assignedToMe > 0 ? "signal" : undefined}
          isPending={isPending}
          isError={isError}
        />

        {isDeptAdmin && (
          <Metric
            label="Awaiting triage"
            value={stats.awaitingTriage}
            caption="Submitted with no reviewer"
            tone={stats.awaitingTriage > 0 ? "signal" : undefined}
            isPending={isPending}
            isError={isError}
          />
        )}

        {isSystemAdmin && (
          <Metric
            label="Active users"
            value={stats.activeUsers}
            caption="Across every department"
            isPending={stats.users.isPending}
            isError={stats.users.isError}
          />
        )}
      </MetricRow>

      {/* A count over a window is not the same claim as a count over
          everything, and the difference has to be visible or the number is a
          quiet lie. */}
      {stats.isTruncated && (
        <p className="pt-2 text-xs text-muted-foreground">
          Counted over the {stats.rows.length} most recent of {stats.total}{" "}
          tickets.
        </p>
      )}

      <div className="grid gap-8 border-t pt-6 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <section className="min-w-0">
          <SectionHeading
            action={
              <Link
                to="/tickets"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            {isDeptAdmin ? "Department queue" : "Your tickets"}
          </SectionHeading>

          {/* The four states every screen owes the user (WORKFLOW.md §A10). The
              fourth, forbidden, is handled by the router before this renders. */}
          {isPending ? (
            <LoadingRows rows={QUEUE_ROWS} columns={4} />
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : queue.length === 0 ? (
            <ListEmptyState
              title="Nothing open"
              description={
                isDeptAdmin
                  ? "Every ticket in your department is closed or rejected."
                  : "You have no tickets waiting. Raise one when you need something."
              }
              action={newTicketButton}
            />
          ) : (
            <DataTable
              columns={columns}
              data={queue}
              onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
              // Tickets differ in state row to row, so the claim bar carries
              // information here. No meta/page props: this is the top of a
              // queue, not a paginated list, and "View all" is the way deeper.
              rowAccent={(ticket) => TICKET_STATUS_META[ticket.status]?.bar}
            />
          )}
        </section>

        <RecentActivity />
      </div>
    </>
  );
}

export default DashboardPage;
