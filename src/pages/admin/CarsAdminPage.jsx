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
import CarFormDialog from "@/features/cars/CarFormDialog";
import { useCars, useDeleteCar } from "@/features/cars/useCars";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * The master list of bookable cars — ADMIN_SYSTEM only, gated in
 * routes/index.jsx. Everyone else reads the same fleet through CarsPage, which
 * shows availability and cannot change any of this.
 *
 * Search runs over rows the server ALREADY sent, like RoomsAdminPage: GET
 * /reserves/cars takes no page, limit, or filter params and returns the whole
 * table. The moment the endpoint learns `q` and `page`, this page joins the
 * rest on useListQuery.
 */

/** Client-side paging over the full list, so the table is not 200 rows long. */
const PAGE_SIZE = 20;

export function CarsAdminPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  /**
   * Both dialogs keep their subject AFTER they are told to close, because Radix
   * animates the exit. Clearing the car on close re-renders the still-visible
   * dialog with no subject, and the edit form visibly flips to "New car" on its
   * way out. `open` is the flag; `car` is remembered until the next open
   * replaces it.
   */
  const [formDialog, setFormDialog] = useState({ open: false, car: undefined });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, car: null });

  const debouncedSearch = useDebounce(search);

  const { data: cars, isPending, isError, error, refetch } = useCars();
  const deleteMutation = useDeleteCar();

  const isFiltered = Boolean(debouncedSearch);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return cars ?? [];
    return (cars ?? []).filter((car) =>
      [car.name, car.plate, car.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [cars, debouncedSearch]);

  // Page 4 of the old result set is meaningless against a new one.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const confirmDelete = () => {
    const target = deleteDialog.car;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.name} deleted`);
        setDeleteDialog((previous) => ({ ...previous, open: false }));
      },
      onError: (mutationError) => {
        // The car is referenced by a booking and the foreign key refused
        // (Prisma P2003 becomes a 409 in car.controller.js). That is the
        // database protecting history, so say so — "Something went wrong" would
        // send the admin looking for a bug.
        toast.error(
          mutationError.status === 409
            ? "This car cannot be deleted while it still has bookings."
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
        header: "Vehicle",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "plate",
        header: "Plate",
        // tabular-nums, never mono: no monospace family carries Thai, and a
        // plate like `1กท 5678` would split faces mid-string.
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums">
            {row.original.plate}
          </span>
        ),
      },
      {
        accessorKey: "seats",
        header: "Seats",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {row.original.seats} {row.original.seats === 1 ? "seat" : "seats"}
          </span>
        ),
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
                  onSelect={() => setFormDialog({ open: true, car: target })}
                >
                  Edit car
                </DropdownMenuItem>
                {/*
                  CarsPage has no per-car route — it draws the whole grid and
                  narrows it with its own search box. So this hands that search
                  the car name rather than inventing a route to maintain.
                */}
                <DropdownMenuItem
                  onSelect={() => navigate(`/cars?q=${encodeURIComponent(target.name)}`)}
                >
                  <CalendarRange className="size-4" />
                  View schedule
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteDialog({ open: true, car: target })}
                >
                  Delete car
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [navigate],
  );

  const newCarButton = (
    <Button onClick={() => setFormDialog({ open: true, car: undefined })}>
      <Plus className="size-4" />
      New car
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Manage cars"
        description="The master list of bookable vehicles. Everything here shows up on the Cars availability grid."
      >
        {newCarButton}
      </PageHeader>

      <FilterBar isFiltered={isFiltered} onClear={() => setSearch("")}>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search name, plate or location…"
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows rows={6} columns={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : pageRows.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={() => setSearch("")}
          title="No cars yet"
          description="Nobody can book anything until a vehicle exists here."
          action={newCarButton}
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

      <CarFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((previous) => ({ ...previous, open }))}
        car={formDialog.car}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((previous) => ({ ...previous, open }))}
        title={`Delete ${deleteDialog.car?.name ?? "this car"}?`}
        description="The car disappears from the availability grid and nobody can book it again. If it has ever been booked, the database will refuse and nothing will change."
        confirmLabel="Delete car"
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default CarsAdminPage;
