import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays, format, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { FilterBar, FilterSelect, SearchInput } from "@/components/common/FilterBar";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import { Button } from "@/components/ui/button";
import ScheduleGrid, { GridLegend } from "@/components/reserve/ScheduleGrid";
import { dayColumns } from "@/components/reserve/columns";
import { useCarBookings, useCars } from "@/features/cars/useCars";
import { useDebounce } from "@/hooks/useDebounce";
import { ALL } from "@/lib/constants";

/**
 * Car availability, a window of DAYS at a time.
 *
 * This is where cars stop being "the room screen with different nouns"
 * (STITCH-PROMPTS.md §07 assumed they were). A room booking is an hour and the
 * question is which hour. A car booking is a TRIP — the seed's Fortuner is out
 * for a week — and the question is which DAYS the vehicle is free. An hourly
 * grid answers that badly: every trip fills its row edge to edge, and every day
 * of a week-long trip looks identical to every other.
 *
 * So the grid draws a rolling window of whole days, and blocks snap to the days
 * they touch. See ScheduleGrid — the component is shared with Rooms; only the
 * columns differ.
 *
 * Search, size, and location all filter rows the server ALREADY sent, because
 * GET /reserves/cars takes no params — same reasoning as RoomsPage and
 * UsersPage. That is presentation, not access control.
 */
/** A stable identity, so the useMemos below do not rerun on every render. */
const NO_CARS = [];

/**
 * How many days the window shows, and therefore how many columns.
 *
 * FOURTEEN, measured rather than guessed. Thirty was tried and does not fit:
 * the grid needs 180px of gutter plus a 34px floor per column, so a month is
 * 1200px of hard minimum and the columns never grow past that floor at ANY
 * desktop width. At 1024 it hides seven of the thirty days behind a horizontal
 * scrollbar — a month view whose last week is off-screen is a fortnight view
 * with extra steps. Fourteen columns come out at 73px on a 1512 screen and
 * still 38px at 1024, with no scrollbar anywhere.
 *
 * It also matches the trips. The seeded ones run one to seven days, which is
 * what a company car is actually taken for; a fortnight holds the longest of
 * them plus enough either side to see what it butts against. Thirty columns
 * spends half the screen on days nobody has booked yet.
 *
 * ROLLING from today, not the calendar month: "the next two weeks" is the
 * question people arrive with, and a calendar month answers it worst exactly
 * when it matters most — on the 28th it would show three days ahead and hide
 * the whole of next week behind a page turn.
 *
 * The endpoint speaks calendar months regardless (getCarAvailability), so a
 * rolling window costs two fetches per car whenever it straddles the 1st.
 * useCarBookings merges and dedupes them, and caches per month, which makes
 * stepping cheap.
 */
const WINDOW_DAYS = 14;

const SIZE_OPTIONS = [
  { value: "2", label: "2 or more seats" },
  { value: "4", label: "4 or more seats" },
  { value: "7", label: "7 or more seats" },
  { value: "12", label: "12 or more seats" },
];

/**
 * A rejected or cancelled trip is free space, and must draw as free space.
 * The rooms endpoint drops these server-side; the car one does not.
 */
const HOLDS_A_SLOT = new Set(["PENDING", "APPROVED"]);

/**
 * The "YYYY-MM" keys a window covers — one when it sits inside a month, two
 * when it straddles the 1st. The endpoint cannot answer any other way.
 */
function monthsSpanning(from, to) {
  const months = new Set();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    months.add(format(cursor, "yyyy-MM"));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return [...months];
}

export function CarsPage() {
  const [from, setFrom] = useState(() => startOfDay(new Date()));
  /**
   * ?q= seeds the search box, which is how "View schedule" on the cars admin
   * page points here at one car — there is no per-car route, and the grid
   * already knows how to narrow itself.
   *
   * ponytail: seeds once, on mount. Same limitation RoomsPage documents.
   */
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [size, setSize] = useState(ALL);
  const [location, setLocation] = useState(ALL);

  const debouncedSearch = useDebounce(search);

  const columns = useMemo(() => dayColumns(from, WINDOW_DAYS), [from]);
  const to = columns[columns.length - 1].end;
  const months = useMemo(() => monthsSpanning(from, to), [from, to]);

  const carsQuery = useCars();
  const cars = carsQuery.data ?? NO_CARS;
  const bookingsQuery = useCarBookings(cars, months);

  /**
   * Locations come from the cars themselves. `location` is a free-text column,
   * so there is no depot table to read and inventing one for a select would be
   * a schema change to populate a dropdown.
   */
  const locationOptions = useMemo(
    () =>
      [...new Set(cars.map((car) => car.location).filter(Boolean))]
        .sort()
        .map((value) => ({ value, label: value })),
    [cars],
  );

  const isFiltered =
    Boolean(debouncedSearch) || size !== ALL || location !== ALL;

  const clearFilters = () => {
    setSearch("");
    setSize(ALL);
    setLocation(ALL);
  };

  const visibleCars = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return cars.filter((car) => {
      if (location !== ALL && car.location !== location) return false;
      if (size !== ALL && car.seats < Number(size)) return false;
      if (!needle) return true;
      return [car.name, car.plate, car.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [cars, debouncedSearch, size, location]);

  /**
   * The fetched months, narrowed to the window on screen.
   *
   * OVERLAP, not "starts in the window": a trip that left last Thursday and
   * gets back on Tuesday still has the van away, and matching on the start date
   * would draw that row free for the days that matter most. Half-open on both
   * ends, so a trip ending at 08:00 does not claim a window starting at 08:00.
   */
  const windowBookings = useMemo(
    () =>
      (bookingsQuery.data ?? []).filter(
        (booking) =>
          HOLDS_A_SLOT.has(booking.status) &&
          new Date(booking.startTime) < to &&
          new Date(booking.endTime) > from,
      ),
    [bookingsQuery.data, from, to],
  );

  // The orange rule marks now, so it only means anything while the window
  // actually contains it.
  const today = new Date();
  const now = today >= from && today < to ? today : null;

  const isPending = carsQuery.isPending || bookingsQuery.isPending;
  const error = carsQuery.error ?? bookingsQuery.error;

  const rangeLabel = `${format(from, "d MMM")} – ${format(
    addDays(to, -1),
    "d MMM yyyy",
  )}`;

  return (
    <>
      <PageHeader
        title="Cars"
        description={`${visibleCars.length} ${
          visibleCars.length === 1 ? "vehicle" : "vehicles"
        }, ${rangeLabel}`}
      />

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Previous ${WINDOW_DAYS} days`}
            onClick={() => setFrom((current) => addDays(current, -WINDOW_DAYS))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-40 text-center text-sm tabular-nums">
            {rangeLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Next ${WINDOW_DAYS} days`}
            onClick={() => setFrom((current) => addDays(current, WINDOW_DAYS))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFrom(startOfDay(new Date()))}
          >
            Today
          </Button>
        </div>

        <FilterSelect
          value={size}
          onChange={setSize}
          options={SIZE_OPTIONS}
          allLabel="Any size"
        />
        <FilterSelect
          value={location}
          onChange={setLocation}
          options={locationOptions}
          allLabel="All locations"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or plate"
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows rows={6} columns={4} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            carsQuery.refetch();
            bookingsQuery.refetch();
          }}
        />
      ) : visibleCars.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          title="No cars yet"
          description="No vehicles have been added. An admin can create one from Manage cars."
        />
      ) : (
        <>
          <div className="flex justify-end pb-3">
            <GridLegend />
          </div>
          <ScheduleGrid
            resources={visibleCars}
            bookings={windowBookings}
            bookingKey="carId"
            subtitle={(car) =>
              [car.plate, `${car.seats} seats`, car.location]
                .filter(Boolean)
                .join(" · ")
            }
            // Carries the day column that was clicked, seeding the calendar
            // on it as a one-day trip the user can drag longer.
            bookingHref={(booking) => `/bookings/car/${booking.id}`}
            bookHref={(car, column) =>
              `/cars/${car.id}/book?date=${format(column.start, "yyyy-MM-dd")}`
            }
            columns={columns}
            snap
            now={now}
          />
          <p className="pt-4 text-xs text-muted-foreground">
            A vehicle is shown as out for every day its trip touches. Hover a
            block for the exact departure and return times.
          </p>
        </>
      )}
    </>
  );
}

export default CarsPage;
