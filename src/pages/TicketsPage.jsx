import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import {
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/common/FilterBar";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import StatusChip, { PriorityDot } from "@/components/common/StatusChip";
import { useListQuery } from "@/hooks/useListQuery";
import {
  assigneeId,
  creatorId,
  useTickets,
} from "@/features/tickets/useTickets";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, fullName } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL,
  PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from "@/lib/constants";

/**
 * The ticket list (WORKFLOW.md §A4).
 *
 * ONE list for every role. STAFF, ADMIN_DEPT, and ADMIN_SYSTEM all call the
 * same GET /api/tickets and the backend decides which rows come back — so there
 * is deliberately no role branch anywhere in this file. A client-side role
 * filter would mean the rows had already been sent to a browser that should not
 * have them.
 *
 * The SCOPE TABS are a view over that same response, not a second request. One
 * flat list arrives holding both the tickets you raised and the ones waiting on
 * you; the tabs are what tell them apart. This narrows what is displayed from
 * rows the user was already entitled to see, which is presentation — not the
 * role filtering the README forbids.
 *
 * Composition only: the query lives in features/tickets/useTickets.js, the list
 * state in hooks/useListQuery.js, and everything rendered here takes props.
 */

/** The sort strings the API understands (API.md → List query parameters). */
const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "updated_at:desc", label: "Recently updated" },
  { value: "priority:desc", label: "Priority" },
];

/**
 * A tab is a VIEW, not a filter — so scope lives in its own state rather than
 * in useListQuery, and the FilterBar's Reset leaves it alone. Someone clearing
 * a status filter does not expect to be thrown back to everyone's tickets.
 */
const SCOPES = {
  all: {
    label: "All",
    emptyTitle: "No tickets yet",
    emptyDescription:
      "When you raise a request, or one lands in your department, it shows up here.",
  },
  mine: {
    label: "My requests",
    emptyTitle: "You have not raised any tickets",
    emptyDescription:
      "Tickets you create appear here, whoever ends up working on them.",
  },
  assigned: {
    label: "Assigned to me",
    emptyTitle: "Nothing is assigned to you",
    emptyDescription:
      "Tickets land here once someone assigns them to you during triage.",
  },
};

export function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scope, setScope] = useState("all");

  const {
    query,
    page,
    setPage,
    sort,
    setSort,
    search,
    setSearch,
    filters,
    setFilter,
    isFiltered,
    clearFilters,
  } = useListQuery({
    defaultSort: "created_at:desc",
    // Only the filters that map one-to-one onto a documented query param. A
    // "mine / assigned to me" scope needs assigned_to=me and created_by=me,
    // which is two params from one control — leave it until the endpoint is
    // actually mounted and its behaviour can be checked.
    filters: { status: ALL, priority: ALL },
  });

  const { data, isPending, isError, error, refetch, isFetching } =
    useTickets(query);

  const allTickets = data?.tickets ?? [];

  /**
   * One pass, three lists — the tab counts and the table read the same arrays,
   * so a count can never disagree with the rows it claims to describe.
   *
   * A ticket you raised AND own belongs in both, which is correct: "mine" and
   * "assigned to me" are questions about different columns, not a partition.
   *
   * ponytail: STAFF sees an empty "My requests" tab — readTicket() scopes them
   * to assignedToId only, so the rows they created never reach the browser.
   * Fix is OR: [{ createdById }, { assignedToId }] in ticket.service.js; not
   * worked around here, because the workaround would have to be deleted again.
   */
  const scoped = useMemo(() => {
    const me = user?.id ?? null;
    // No id yet (session still bootstrapping) means no ticket is "mine".
    // Without this, `null === null` makes every UNASSIGNED ticket match the
    // assigned tab — the emptiest state showing the most rows.
    if (me == null) return { all: allTickets, mine: [], assigned: [] };
    return {
      all: allTickets,
      mine: allTickets.filter((ticket) => creatorId(ticket) === me),
      assigned: allTickets.filter((ticket) => assigneeId(ticket) === me),
    };
    // allTickets is a fresh array each render; data is the stable identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user?.id]);

  const rows = scoped[scope];

  // Rebuilt only when the columns actually change — TanStack Table resets its
  // internal state when the array identity changes on every render.
  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Ticket",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              #{row.original.id}
              {row.original.requestType?.name
                ? ` · ${row.original.requestType.name}`
                : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusChip value={row.original.status} />,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityDot value={row.original.priority} />,
      },
      {
        accessorKey: "assignedTo",
        header: "Assignee",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedTo ? (
              fullName(row.original.assignedTo)
            ) : (
              // Unassigned is a real state, not missing data — it is what the
              // department queue is triaging.
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
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

  return (
    <>
      <PageHeader
        title="Tickets"
        description="Your requests, or your department queue. The backend decides which rows you see."
      >
        {newTicketButton}
      </PageHeader>

      {/* The table lives outside <Tabs>: the tab only drives state, so three
          TabsContent copies of the same markup would buy nothing. */}
      <Tabs value={scope} onValueChange={setScope} className="pb-4">
        <TabsList>
          {Object.entries(SCOPES).map(([key, meta]) => (
            <TabsTrigger key={key} value={key}>
              {meta.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {scoped[key].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search title or description…"
        />
        <FilterSelect
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
          options={TICKET_STATUS_OPTIONS}
          allLabel="All statuses"
        />
        <FilterSelect
          value={filters.priority}
          onChange={(value) => setFilter("priority", value)}
          options={PRIORITY_OPTIONS}
          allLabel="All priorities"
        />
        {/* Not a FilterSelect: sort has no "any" option — picking ALL would
            send sort=__all__ to the API. */}
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:ml-auto sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* The four states every screen owes the user (WORKFLOW.md §A10). The
          fourth, forbidden, is handled by the router before this renders. */}
      {isPending ? (
        <LoadingRows rows={6} columns={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          title={SCOPES[scope].emptyTitle}
          description={SCOPES[scope].emptyDescription}
          // Only the All tab offers "create your first ticket". On the assigned
          // tab a new ticket would not land there, so the button is a dead end.
          action={scope === "assigned" ? undefined : newTicketButton}
        />
      ) : (
        <div data-pending={isFetching || undefined} className="data-[pending]:opacity-60 transition-opacity">
          <DataTable
            columns={columns}
            data={rows}
            meta={data?.meta}
            page={page}
            onPageChange={setPage}
            onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          />
        </div>
      )}
    </>
  );
}

export default TicketsPage;
