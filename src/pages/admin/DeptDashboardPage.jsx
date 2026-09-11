import { format, parseISO } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import MetricRow, { Metric } from "@/components/common/MetricRow";
import ErrorState from "@/components/common/ErrorState";
import { StatusPill } from "@/components/common/StatusChip";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/features/dashboard/useDashboardStats";
import { TICKET_STATUS_META } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The department admin's read of their own queue (PLAN.md §3).
 *
 * No role filtering happens in this file. The route is gated by
 * ProtectedRoute roles={DEPT_ADMINS}, and readTicket() on the backend scopes
 * the rows to the caller's department — an ADMIN_DEPT and an ADMIN_SYSTEM call
 * the identical GET /api/tickets and get different rows. Filtering here would
 * mean rows the browser should never have received had already been sent.
 *
 * Response times are NOT here, and cannot be until the schema changes. model
 * Ticket carries createdAt and updatedAt only (prisma/schema.prisma) — updatedAt
 * moves on every comment and every reassignment, so "time to resolve" measured
 * from it would be a number that looks precise and means nothing. A resolvedAt
 * column set on the transition into RESOLVED is the fix; there is no way to
 * approximate it honestly from what exists.
 *
 * Both visuals are plain divs rather than a chart library. recharts is in
 * package.json and unused, but these are two bar rows in a design with no
 * shadows, no cards and 1px rules, and getting recharts to stop drawing its own
 * furniture is more code than drawing the bars.
 */

/** Sunday-first initials, indexed by Date#getDay(). */
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Tickets raised per day over the last fortnight.
 *
 * Heights are a share of the busiest day, not an absolute scale — the question
 * this answers is "when did the work arrive", not "how much". A day with no
 * tickets keeps its column and draws a 1px stub, so the gap is visible as a gap
 * rather than as a missing bar.
 */
function VolumeChart({ days }) {
  const peak = Math.max(1, ...days.map((day) => day.count));

  return (
    // No items-end here: the columns must STRETCH to the full 160px or the
    // bar's percentage height resolves against a box the label already shrank
    // to nothing. The bottom alignment belongs on the wrapper inside, which is
    // the only box the bar actually grows within.
    <div className="flex h-40 gap-1.5" role="list">
      {days.map((day) => {
        const date = parseISO(day.date);
        return (
          <div
            key={day.date}
            role="listitem"
            aria-label={`${format(date, "d MMM")}, ${day.count} ${
              day.count === 1 ? "ticket" : "tickets"
            }`}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t-[2px]",
                  day.count > 0 ? "bg-chart-1" : "bg-border",
                )}
                style={{
                  height: day.count > 0 ? `${(day.count / peak) * 100}%` : "1px",
                }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {WEEKDAY[date.getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Where the department's tickets are sitting. Every status keeps its row even
 * at zero — a list that drops empty statuses reflows as the data changes, and
 * "no rejected tickets" is an answer worth reading.
 */
function StatusMix({ rows, total }) {
  return (
    <div className="divide-y divide-border border-t">
      {rows.map(({ status, count }) => (
        <div key={status} className="flex items-center gap-3 py-2.5">
          <span className="w-28 shrink-0 text-sm">
            {TICKET_STATUS_META[status]?.label ?? status}
          </span>

          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
            />
          </div>

          <span className="w-8 shrink-0 text-right text-sm tabular-nums">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Who is carrying work, and who is free.
 *
 * Every department member keeps a row, including the ones at zero — "no tasks"
 * is the thing an admin scans this list for, and a row that only appeared once
 * someone was busy would hide exactly the people worth assigning to. Ordered
 * busiest first, so the free members collect at the foot of a short list.
 *
 * A ruled list rather than a table: this page has no other table, and the
 * status mix above already established the label/bar/count row.
 */
function TeamWorkload({ rows }) {
  const peak = Math.max(1, ...rows.map((member) => member.open));

  return (
    <div className="divide-y divide-border border-t">
      {rows.map((member) => (
        <div key={member.id} className="flex items-center gap-3 py-2.5">
          <span className="flex w-56 shrink-0 items-center gap-2 truncate text-sm">
            <span className="truncate">{fullName(member)}</span>
            <StatusPill kind="role" value={member.role} />
          </span>

          {member.open === 0 ? (
            <span className="flex-1 text-sm text-muted-foreground">
              No tasks
            </span>
          ) : (
            <>
              {/* aria-hidden: decorative reinforcement of the count beside it,
                  same contract as the status mix bars. */}
              <div
                aria-hidden="true"
                className="h-1.5 flex-1 rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(member.open / peak) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {member.inProgress > 0
                  ? `${member.inProgress} in progress`
                  : null}
              </span>
            </>
          )}

          <span className="w-16 shrink-0 text-right text-sm tabular-nums">
            {member.open === 0 ? (
              <span className="text-muted-foreground">0</span>
            ) : (
              member.open
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DeptDashboardPage() {
  const stats = useDashboardStats({ withTeam: true });
  const { isPending, isError, error, refetch } = stats.tickets;

  // The team list needs BOTH requests: the members from /users and their load
  // from /tickets. Either one still loading means the counts would be wrong,
  // not just incomplete.
  const isTeamPending = isPending || stats.users.isPending;
  const teamError = stats.users.error ?? error;

  return (
    <>
      <PageHeader
        title="Department dashboard"
        description="Ticket volume and status mix for your department."
      />

      {/* One signal metric only: the triage backlog is the thing a department
          admin has to act on. */}
      <MetricRow>
        <Metric
          label="Open tickets"
          value={stats.open}
          caption="Not closed or rejected"
          isPending={isPending}
          isError={isError}
        />
        <Metric
          label="Awaiting triage"
          value={stats.awaitingTriage}
          caption="Submitted with no reviewer"
          tone={stats.awaitingTriage > 0 ? "signal" : undefined}
          isPending={isPending}
          isError={isError}
        />
        <Metric
          label="In progress"
          value={stats.inProgress}
          caption="Someone is working on these"
          isPending={isPending}
          isError={isError}
        />
        <Metric
          label="Unassigned"
          value={stats.unassigned}
          caption="Open work nobody owns"
          isPending={isPending}
          isError={isError}
        />
      </MetricRow>

      {stats.isTruncated && (
        <p className="pt-2 text-xs text-muted-foreground">
          Counted over the {stats.rows.length} most recent of {stats.total}{" "}
          tickets.
        </p>
      )}

      <div className="grid gap-8 border-t pt-6 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        {/* flex-col + mt-auto on the chart: the status mix beside it is the
            taller column, and a chart left at the top of the row hangs its
            baseline in mid-air. Pushed down, the two columns share one floor
            and the day labels read as the axis they are. The heading stays
            put at the top, level with "Status mix". */}
        <section className="flex min-w-0 flex-col">
          <div className="flex items-baseline justify-between gap-4 pb-3">
            <h2 className="text-base font-semibold">Ticket volume</h2>
            <span className="text-xs text-muted-foreground">Last 14 days</span>
          </div>

          {isPending ? (
            <Skeleton className="mt-auto h-40 w-full" />
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <div className="mt-auto">
              <VolumeChart days={stats.byDay} />
            </div>
          )}
        </section>

        <section>
          <h2 className="pb-3 text-base font-semibold">Status mix</h2>

          {isPending ? (
            <div className="space-y-4 border-t pt-4">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              {error?.message ?? "Could not load the status mix."}
            </p>
          ) : (
            <StatusMix rows={stats.byStatus} total={stats.rows.length} />
          )}
        </section>
      </div>

      <section className="border-t pt-6">
        <div className="flex items-baseline justify-between gap-4 pb-3">
          <h2 className="text-base font-semibold">Team workload</h2>
          {!isTeamPending && !teamError && stats.team.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {stats.idleCount} of {stats.team.length} have no open tasks
            </span>
          )}
        </div>

        {isTeamPending ? (
          <div className="space-y-4 border-t pt-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </div>
        ) : teamError ? (
          <ErrorState error={teamError} onRetry={refetch} />
        ) : stats.team.length === 0 ? (
          <p className="border-t pt-4 text-sm text-muted-foreground">
            No one is assigned to this department yet.
          </p>
        ) : (
          <TeamWorkload rows={stats.team} />
        )}
      </section>
    </>
  );
}

export default DeptDashboardPage;
