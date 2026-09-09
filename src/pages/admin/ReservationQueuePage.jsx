import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Check, DoorOpen, X } from "lucide-react";
import { toast } from "sonner";
import DataTable from "@/components/common/DataTable";
import { ListEmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePendingBookings, useSetBookingStatus } from "@/features/bookings/useBookings";
import { ALL } from "@/lib/constants";
import { formatAge, formatDate, formatTime, fullName } from "@/lib/format";

/**
 * The reservation approval queue (STITCH-PROMPTS prompt 12).
 *
 * Nothing in the reserve module confirms itself, so this screen is the
 * bottleneck for the whole thing. It has one job: make the decision fast.
 *
 * NO CLAIM BARS. Every row here is pending, so a bar on every row would encode
 * nothing — the count in the header does that job instead, and the far left
 * edge stays clean. Same reasoning as the users board.
 *
 * Three things prompt 12 asks for are not here:
 *
 *   The conflict row.  The mock disables Approve on a booking that overlaps an
 *                      approved one. That cannot happen any more: both
 *                      room_bookings_no_overlap and car_bookings_no_overlap
 *                      exclude PENDING as well as APPROVED, so the overlapping
 *                      request was refused with a 409 at insert and never
 *                      reached this queue. Approving can no longer double-book.
 *   Reject reason.     The mock collects one in a textarea. There is no column
 *                      to store it and no endpoint that takes it, so the box
 *                      would throw the sentence away and tell the requester it
 *                      had been sent.
 *   "Oldest first".    The server sorts by createdAt and there is no second
 *                      order worth offering, so a select with one real option
 *                      is a control that does nothing.
 */

const TYPE_META = {
  room: { label: "Room", Icon: DoorOpen },
  car: { label: "Car", Icon: Car },
};

const TYPE_OPTIONS = [
  { value: "room", label: "Rooms" },
  { value: "car", label: "Cars" },
];

const EMPTY = [];

const subtitleOf = (booking) => {
  const r = booking.resource;
  if (!r) return "";
  return booking.type === "car"
    ? [r.plate, `${r.seats} seats`, r.location].filter(Boolean).join(" · ")
    : [r.location, `seats ${r.capacity}`].filter(Boolean).join(" · ");
};

export function ReservationQueuePage() {
  const navigate = useNavigate();
  const [type, setType] = useState(ALL);

  const queueQuery = usePendingBookings();
  const setStatus = useSetBookingStatus();

  const pending = queueQuery.data ?? EMPTY;
  const rows = type === ALL ? pending : pending.filter((b) => b.type === type);

  const decide = (booking, status) =>
    setStatus.mutate(
      { type: booking.type, id: booking.id, status },
      {
        onSuccess: () =>
          toast.success(
            `${booking.resource?.name ?? "Booking"} ${
              status === "APPROVED" ? "approved" : "rejected"
            } — ${fullName(booking.user)} has it now.`,
          ),
        onError: (error) => toast.error(error.message),
      },
    );

  /** Which row is mid-write, so only its own buttons spin. */
  const busyOn = setStatus.isPending ? setStatus.variables : null;
  const isBusyRow = (booking) =>
    busyOn?.id === booking.id && busyOn?.type === booking.type;

  const columns = useMemo(
    () => [
      {
        accessorKey: "user",
        header: "Requester",
        cell: ({ row }) => (
          <div className="min-w-36">
            <p className="font-medium">{fullName(row.original.user)}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.user?.department?.name ?? "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "resource",
        header: "Resource",
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="font-medium">{row.original.resource?.name ?? "—"}</p>
            {/* tabular-nums, not mono: no mono face carries Thai, so a plate
                like `1กท 5678` would split across two faces in one string. */}
            <p className="text-xs tabular-nums text-muted-foreground">
              {subtitleOf(row.original)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const { label, Icon } = TYPE_META[row.original.type];
          // Icon AND label. A bare icon column makes the reader learn a key.
          return (
            <span className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
              <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "startTime",
        header: "When",
        cell: ({ row }) => {
          const { startTime, endTime } = row.original;
          const sameDay =
            new Date(startTime).toDateString() === new Date(endTime).toDateString();
          // A multi-day trip must say so here. This is the column the decision
          // is actually made on, and "8 Sep, 09:00–17:00" for a booking that
          // keeps the van until Friday is the one error that matters.
          return (
            <span className="whitespace-nowrap tabular-nums">
              {sameDay
                ? `${formatDate(startTime)}, ${formatTime(startTime)}–${formatTime(endTime)}`
                : `${formatDate(startTime, "d MMM")} ${formatTime(startTime)} → ${formatDate(endTime, "d MMM")} ${formatTime(endTime)}`}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Waiting",
        // The queue's sort key, so it belongs on screen — a row ordered by
        // something invisible reads as unordered.
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatAge(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          // The row opens the booking; these must not also do that.
          <div
            className="flex justify-end gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => decide(row.original, "REJECTED")}
            >
              {isBusyRow(row.original) && busyOn.status === "REJECTED" ? (
                <Spinner />
              ) : (
                <X />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              disabled={setStatus.isPending}
              onClick={() => decide(row.original, "APPROVED")}
            >
              {isBusyRow(row.original) && busyOn.status === "APPROVED" ? (
                <Spinner />
              ) : (
                <Check />
              )}
              Approve
            </Button>
          </div>
        ),
      },
    ],
    // The action cells close over the mutation's live state, so they must be
    // rebuilt when it changes or a spinner never appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setStatus.isPending, busyOn?.id, busyOn?.type, busyOn?.status],
  );

  if (queueQuery.isError) {
    return (
      <>
        <PageHeader title="Reservation queue" />
        <ErrorState error={queueQuery.error} onRetry={queueQuery.refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reservation queue"
        description={
          queueQuery.isPending
            ? "Rooms and cars waiting on a decision."
            : pending.length === 0
              ? "Nothing is waiting on you."
              : `${pending.length} awaiting approval`
        }
      />

      <FilterBar isFiltered={type !== ALL} onClear={() => setType(ALL)}>
        <FilterSelect
          value={type}
          onChange={setType}
          options={TYPE_OPTIONS}
          allLabel="All types"
        />
      </FilterBar>

      {queueQuery.isPending ? (
        <LoadingRows rows={5} columns={6} />
      ) : rows.length === 0 ? (
        <ListEmptyState
          isFiltered={type !== ALL}
          onClearFilters={() => setType(ALL)}
          title="Queue is clear"
          description="Every room and car request has been decided."
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(booking) =>
            navigate(`/bookings/${booking.type}/${booking.id}`, {
              state: { from: "/bookings/pending" },
            })
          }
        />
      )}
    </>
  );
}

export default ReservationQueuePage;
