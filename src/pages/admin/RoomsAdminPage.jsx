import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/common/PageHeader";
import { FilterBar, SearchInput } from "@/components/common/FilterBar";
import DataTable from "@/components/common/DataTable";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import RoomFormDialog from "@/features/rooms/RoomFormDialog";
import { useDeleteRoom, useRooms } from "@/features/rooms/useRooms";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * The master list of bookable rooms — ADMIN_SYSTEM only, gated in
 * routes/index.jsx. Everyone else reads the same rooms through RoomsPage,
 * which shows availability and cannot change any of this.
 *
 * Search runs over rows the server ALREADY sent, like UsersPage and RoomsPage:
 * GET /reserves/rooms takes no page, limit, or filter params and returns the
 * whole table. useListQuery exists to build server params, so pointing it here
 * would render a control that looks like it filters the query and does not.
 * The moment the endpoint learns `q` and `page`, this page joins the rest.
 */

/** Client-side paging over the full list, so the table is not 200 rows long. */
const PAGE_SIZE = 20;

export function RoomsAdminPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  /**
   * Both dialogs keep their subject AFTER they are told to close, because Radix
   * animates the exit. Clearing the room on close re-renders the still-visible
   * dialog with no subject, and the edit form visibly flips to "New room" on
   * its way out. `open` is the flag; `room` is remembered until the next open
   * replaces it.
   */
  const [formDialog, setFormDialog] = useState({ open: false, room: undefined });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, room: null });

  const debouncedSearch = useDebounce(search);

  const { data: rooms, isPending, isError, error, refetch } = useRooms();
  const deleteMutation = useDeleteRoom();

  const isFiltered = Boolean(debouncedSearch);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return rooms ?? [];
    return (rooms ?? []).filter((room) =>
      [room.name, room.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [rooms, debouncedSearch]);

  // Page 4 of the old result set is meaningless against a new one.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmDelete = () => {
    const target = deleteDialog.room;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.name} deleted`);
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
      onError: (mutationError) => {
        // The room is referenced by a booking and the foreign key refused
        // (Prisma P2003 becomes a 409). That is the database protecting
        // history, so say so — "Something went wrong" would send the admin
        // looking for a bug.
        toast.error(
          mutationError.status === 409
            ? "This room cannot be deleted while it still has bookings."
            : mutationError.message,
        );
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Room",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) =>
          row.original.location ? (
            <span className="text-sm">{row.original.location}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "capacity",
        header: "Capacity",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {row.original.capacity} {row.original.capacity === 1 ? "person" : "people"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const target = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${target.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => setFormDialog({ open: true, room: target })}
                >
                  Edit room
                </DropdownMenuItem>
                {/*
                  RoomsPage has no per-room route — it draws the whole grid and
                  narrows it with its own search box. So this hands that search
                  the room name rather than inventing a route to maintain.
                */}
                <DropdownMenuItem
                  onSelect={() => navigate(`/rooms?q=${encodeURIComponent(target.name)}`)}
                >
                  <CalendarRange className="size-4" />
                  View schedule
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteDialog({ open: true, room: target })}
                >
                  Delete room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [navigate],
  );

  const newRoomButton = (
    <Button onClick={() => setFormDialog({ open: true, room: undefined })}>
      <Plus className="size-4" />
      New room
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Manage rooms"
        description="The master list of bookable rooms. Everything here shows up on the Rooms availability grid."
      >
        {newRoomButton}
      </PageHeader>

      <FilterBar isFiltered={isFiltered} onClear={() => setSearch("")}>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name or location…"
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows rows={6} columns={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : pageRows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={() => setSearch("")}
          title="No rooms yet"
          description="Nobody can book anything until a room exists here."
          action={newRoomButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={pageRows}
          meta={{ total: filtered.length, limit: PAGE_SIZE }}
          page={currentPage}
          onPageChange={setPage}
        />
      )}

      <RoomFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((previous) => ({ ...previous, open }))}
        room={formDialog.room}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((previous) => ({ ...previous, open }))}
        title={`Delete ${deleteDialog.room?.name ?? "this room"}?`}
        description="The room disappears from the availability grid and nobody can book it again. If it has ever been booked, the database will refuse and nothing will change."
        confirmLabel="Delete room"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default RoomsAdminPage;
