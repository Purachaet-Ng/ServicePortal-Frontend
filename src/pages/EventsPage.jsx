import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable from "@/components/common/DataTable";
import { ListEmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import {
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/common/FilterBar";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEvents } from "@/features/events/useEvents";
import { usePermission } from "@/hooks/usePermission";
import { ALL, EVENT_STATUS_META } from "@/lib/constants";
import { formatTimeRange, fullName } from "@/lib/format";
import { Plus } from "lucide-react";


const RSVP_LABEL = {
  INVITED: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  ATTENDED: "Attended",
  ABSENT: "Absent",
};

const STATUS_OPTIONS = Object.entries(EVENT_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label }),
);

const SCHEDULE_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Recently added" },
  { value: "schedule", label: "Starting soonest" },
];

export function EventsPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canManage = can("event:manage");
  const eventsQuery = useEvents();
  const events = eventsQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [schedule, setSchedule] = useState(ALL);
  const [sort, setSort] = useState("newest");
  const [now] = useState(() => Date.now());

  const needle = search.trim().toLowerCase();
  const visibleEvents = events
    .filter((event) => {
      if (
        needle &&
        ![event.title, event.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(needle))
      ) {
        return false;
      }

      if (status !== ALL && event.status !== status) return false;

      const isPast = new Date(event.endTime).getTime() < now;
      return schedule === ALL || (schedule === "upcoming" ? !isPast : isPast);
    })
    .sort((a, b) =>
      sort === "newest"
        ? b.id - a.id
        : new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const isFiltered = Boolean(needle) || status !== ALL || schedule !== ALL;

  const clearFilters = () => {
    setSearch("");
    setStatus(ALL);
    setSchedule(ALL);
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Event",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-medium">{row.original.title}</p>
            {row.original.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatTimeRange(
              row.original.startTime,
              row.original.endTime,
            )}
          </span>
        ),
      },
      {
        id: "organizer",
        header: "Organizer",
        cell: ({ row }) => fullName(row.original.organizer),
      },
      {
        accessorKey: "status",
        header: "Event status",
        cell: ({ row }) => (
          <StatusChip kind="event" value={row.original.status} />
        ),
      },
      ...(!canManage
        ? [
            {
              accessorKey: "rsvpStatus",
              header: "My status",
              cell: ({ row }) =>
                row.original.status === "CANCEL"
                  ? "Cancelled"
                  : RSVP_LABEL[row.original.rsvpStatus] ??
                    row.original.rsvpStatus ??
                    "—",
            },
          ]
        : []),
    ],
    [canManage],
  );

  return (
    <>
      <PageHeader
        title={canManage ? "Events" : "My events"}
        description={
          canManage
            ? "Create and manage company events."
            : "Your invitations and attendance."
        }
      >
        {canManage && (
          <Button asChild>
            <Link to="/events/new">
            <Plus className="size-4" />
            New event
            </Link>
          </Button>
        )}
      </PageHeader>

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search title or description…"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          allLabel="All statuses"
        />
        <FilterSelect
          value={schedule}
          onChange={setSchedule}
          options={SCHEDULE_OPTIONS}
          allLabel="All schedules"
        />
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

      {eventsQuery.isError ? (
        <ErrorState
          error={eventsQuery.error}
          onRetry={eventsQuery.refetch}
        />
      ) : eventsQuery.isPending ? (
        <LoadingRows rows={5} columns={canManage ? 4 : 5} />
      ) : visibleEvents.length === 0 ? (
        <ListEmptyState
          title={
            isFiltered
              ? "No matching events"
              : canManage
                ? "No events yet"
                : "No invitations yet"
          }
          description={
            canManage
              ? "Create an event to invite employees."
              : "Events you are invited to will appear here."
          }
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
        />
      ) : (
        <DataTable
          columns={columns}
          data={visibleEvents}
          rowAccent={(event) => EVENT_STATUS_META[event.status]?.bar}
          onRowClick={(event) => navigate(`/events/${event.id}`)}
        />
      )}
    </>
  );
}

export default EventsPage;
