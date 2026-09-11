import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { FilterBar, SearchInput } from "@/components/common/FilterBar";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { StatusChip } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EventFormDialog from "@/features/events/EventFormDialog";
import { useCancelEvent, useEvents } from "@/features/events/useEvents";
import { EVENT_STATUS_META } from "@/lib/constants";
import { formatTimeRange, fullName } from "@/lib/format";

const PAGE_SIZE = 20;

export default function EventsAdminPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editDialog, setEditDialog] = useState({ open: false, event: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, event: null });
  const eventsQuery = useEvents();
  const deleteEvent = useCancelEvent();
  const events = eventsQuery.data;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return events ?? [];

    return (events ?? []).filter((event) =>
      [event.title, event.description, event.location, fullName(event.organizer)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [events, search]);

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmDelete = () => {
    deleteEvent.mutate(deleteDialog.event.id, {
      onSuccess: (response) => {
        toast.success(response.message);
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
      onError: (error) => toast.error(error.message),
    });
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
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => row.original.location || "—",
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatTimeRange(row.original.startTime, row.original.endTime)}
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
        header: "Status",
        cell: ({ row }) => <StatusChip kind="event" value={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const event = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${event.title}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setEditDialog({ open: true, event })}
                >
                  Edit event
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/events/${event.id}`)}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={event.status !== "PENDING"}
                  onSelect={() => setDeleteDialog({ open: true, event })}
                >
                  Delete event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [navigate],
  );

  const newEventButton = (
    <Button asChild>
      <Link to="/events/new">
        <Plus className="size-4" />
        New event
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Manage events"
        description="Create events and manage their attendance."
      >
        {newEventButton}
      </PageHeader>

      <FilterBar
        isFiltered={Boolean(search)}
        onClear={() => {
          setSearch("");
          setPage(1);
        }}
      >
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search event, location or organizer…"
        />
      </FilterBar>

      {eventsQuery.isPending ? (
        <LoadingRows rows={6} columns={6} />
      ) : eventsQuery.isError ? (
        <ErrorState error={eventsQuery.error} onRetry={eventsQuery.refetch} />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={Boolean(search)}
          onClearFilters={() => {
            setSearch("");
            setPage(1);
          }}
          title="No events yet"
          description="Create an event to invite employees."
          action={newEventButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          meta={{ total: filtered.length, limit: PAGE_SIZE }}
          page={currentPage}
          onPageChange={setPage}
          rowAccent={(event) => EVENT_STATUS_META[event.status]?.bar}
        />
      )}

      <EventFormDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((previous) => ({ ...previous, open }))}
        event={editDialog.event}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((previous) => ({ ...previous, open }))}
        title={`Delete ${deleteDialog.event?.title ?? "this event"}?`}
        description="The event will be cancelled and its attendance history will be kept."
        confirmLabel="Delete event"
        isPending={deleteEvent.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
