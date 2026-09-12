import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSameDay } from "date-fns";
import { Car, DoorOpen } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataTable from "@/components/common/DataTable";
import { ListEmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import LoadingRows from "@/components/common/LoadingRows";
import PageHeader from "@/components/common/PageHeader";
import { StatusPill } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelBooking, useMyBookings } from "@/features/bookings/useBookings";
import {
  ALL,
  HOLDS_A_SLOT,
} from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";

/**
 * Everything you have claimed, rooms and cars in ONE board (STITCH-PROMPTS
 * prompt 11).
 *
 * That is the point of the screen, and the reason it reads a combined endpoint
 * rather than stitching the two availability grids together: one place to see
 * everything you have claimed, whatever kind of thing it is. Two boards under
 * two headings would make the reader do the merging.
 *
 * A board, not cards — many records, so the structure IS the rules.
 *
 * Three deliberate departures from prompt 11, all because the data does not
 * exist rather than because the design was ignored:
 *
 *   No "Purpose" column.   Neither RoomBooking nor CarBooking has such a field.
 *                          The mock invented "Team standup"; there is nowhere
 *                          for a user to have typed it.
 *   No header button.      There is no route that books "a resource" — the
 *                          grids ARE the pickers, and two buttons would break
 *                          PageHeader's one-primary-action rule. The CTA lives
 *                          in the empty state, where the prompt also puts one.
 *   Select, not segmented. No segmented control exists in components/ui.
 */

const EMPTY = [];

const TYPE_META = {
  room: { label: "Room", Icon: DoorOpen },
  car: { label: "Car", Icon: Car },
};

const TYPE_OPTIONS = [
  { value: "room", label: "Rooms" },
  { value: "car", label: "Cars" },
];

/** The resource's second line — plate and seats for a car, floor and seats for a room. */
const subtitleOf = (booking) => {
  const r = booking.resource;
  if (!r) return "";
  return booking.type === "car"
    ? [r.plate, `${r.seats} seats`, r.location].filter(Boolean).join(" · ")
    : [r.location, `seats ${r.capacity}`].filter(Boolean).join(" · ");
};

export function MyBookingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [type, setType] = useState(ALL);
  const [confirming, setConfirming] = useState(null);

  const bookingsQuery = useMyBookings();
  const cancelBooking = useCancelBooking();

  const bookings = bookingsQuery.data ?? EMPTY;

  /**
   * Upcoming vs past splits on endTime, not startTime: a meeting that started
   * an hour ago and runs until five is still something you are in, and moving
   * it to "Past" the moment it begins would file it away while it is happening.
   *
   * Computed during render and deliberately NOT memoised on [bookings] — the
   * inputs are the rows AND the clock, and a memo keyed on the rows alone
   * freezes the split at whatever time the tab was opened. Same reasoning as
   * the now-line in RoomsPage, and it is a filter over a handful of rows.
   */
  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.endTime) >= now);
  const past = bookings.filter((b) => new Date(b.endTime) < now);

  const inTab = tab === "upcoming" ? upcoming : past;
  const rows = type === ALL ? inTab : inTab.filter((b) => b.type === type);

  /**
   * The header sentence counts what you actually have COMING, so a cancelled
   * or rejected booking is not one of them — it is still listed under
   * Upcoming, because that tab is a split on time and hiding rows would make
   * the tab count disagree with the board, but "3 upcoming" must not include a
   * booking that will not happen.
   */
  const live = upcoming.filter((b) => HOLDS_A_SLOT.includes(b.status));
  const awaiting = live.filter((b) => b.status === "PENDING").length;

  const columns = useMemo(
    () => [
      {
        accessorKey: "resource",
        header: "Resource",
        cell: ({ row }) => (
          <div className="min-w-44">
            <p className="font-medium">{row.original.resource?.name ?? "—"}</p>
            {/* tabular-nums and NOT a mono face — no monospace family carries
                Thai, so a plate like `1กท 5678` would split across two faces
                inside one string. */}
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
          // The icon AND its label, always. A bare icon column makes the reader
          // learn a key before they can read the board (prompt 11).
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
        header: "Date",
        cell: ({ row }) => {
          const { startTime, endTime } = row.original;
          // A car trip spans days. Printing only the start date next to a
          // "09:00 – 17:00" time column claims it comes back the same evening,
          // which for a vehicle somebody else wants on the 11th is the one
          // thing this row must not get wrong.
          const oneDay = isSameDay(new Date(startTime), new Date(endTime));
          return (
            <span className="whitespace-nowrap tabular-nums">
              {oneDay
                ? formatDate(startTime)
                : `${formatDate(startTime, "d MMM")} – ${formatDate(endTime)}`}
            </span>
          );
        },
      },
      {
        accessorKey: "endTime",
        header: "Time",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatTime(row.original.startTime)} – {formatTime(row.original.endTime)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusPill kind="reservation" value={row.original.status} />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          HOLDS_A_SLOT.includes(row.original.status) ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              // The row itself opens the booking; without this the click
              // reaches the row handler too and the dialog opens on a page
              // that is already navigating away.
              onClick={(event) => {
                event.stopPropagation();
                setConfirming(row.original);
              }}
            >
              Cancel
            </Button>
          ) : null,
      },
    ],
    [],
  );

  const clearFilters = () => setType(ALL);
  const isFiltered = type !== ALL;

  const cancel = () =>
    cancelBooking.mutate(
      { type: confirming.type, id: confirming.id },
      {
        onSuccess: () => {
          setConfirming(null);
          toast.success("Booking cancelled — the slot is free again.");
        },
        onError: (error) => {
          setConfirming(null);
          toast.error(error.message);
        },
      },
    );

  const renderBoard = () => {
    if (bookingsQuery.isError) {
      return <ErrorState error={bookingsQuery.error} onRetry={bookingsQuery.refetch} />;
    }
    if (bookingsQuery.isPending) {
      return <LoadingRows rows={5} columns={6} />;
    }
    if (rows.length === 0) {
      return (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          title={tab === "upcoming" ? "Nothing booked" : "No past bookings"}
          description={
            tab === "upcoming"
              ? "Rooms and cars you reserve will appear here."
              : "Rooms and cars you have booked will appear here once they finish."
          }
          action={
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link to="/rooms">Book a room</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/cars">Book a car</Link>
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={(booking) =>
          navigate(`/bookings/${booking.type}/${booking.id}`, {
            state: { from: "/my-bookings" },
          })
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        title="My bookings"
        description={
          bookingsQuery.isPending
            ? "Rooms and cars you have reserved."
            : `${live.length} upcoming, ${awaiting} awaiting approval`
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="pb-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <FilterSelect
          value={type}
          onChange={setType}
          options={TYPE_OPTIONS}
          allLabel="All types"
        />
      </FilterBar>

      {renderBoard()}

      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Cancel this booking?"
        description={
          confirming &&
          `${confirming.resource?.name ?? "This booking"}, ${formatDate(
            confirming.startTime,
          )} ${formatTime(confirming.startTime)}–${formatTime(
            confirming.endTime,
          )}. The slot goes back to the grid immediately and someone else can take it.`
        }
        confirmLabel="Cancel booking"
        isPending={cancelBooking.isPending}
        onConfirm={cancel}
      />
    </>
  );
}

export default MyBookingsPage;
