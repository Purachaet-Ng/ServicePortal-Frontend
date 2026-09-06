import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { FilterBar, FilterSelect, SearchInput } from "@/components/common/FilterBar";
import ListEmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingRows from "@/components/common/LoadingRows";
import { Button } from "@/components/ui/button";
import DayGrid, { GridLegend } from "@/components/rooms/DayGrid";
import { useDayBookings, useRooms } from "@/features/rooms/useRooms";
import { useDebounce } from "@/hooks/useDebounce";
import { ALL } from "@/lib/constants";

/**
 * Room availability, one day at a time (STITCH-PROMPTS.md §10).
 *
 * The room list and the day's bookings are two queries, not one: rooms change
 * when someone renovates, bookings change while you are looking at them. Only
 * the second needs a short staleTime.
 *
 * Search, capacity, and floor all filter rows the server ALREADY sent, because
 * GET /reserves/rooms takes no params — same reasoning as UsersPage. That is
 * presentation, not access control. Move to useListQuery if the endpoint ever
 * learns them.
 */
/** A stable identity, so the useMemos below do not rerun on every render. */
const NO_ROOMS = [];

const CAPACITY_OPTIONS = [
  { value: "2", label: "2 or more" },
  { value: "6", label: "6 or more" },
  { value: "10", label: "10 or more" },
  { value: "20", label: "20 or more" },
];

export function RoomsPage() {
  const [day, setDay] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [capacity, setCapacity] = useState(ALL);
  const [floor, setFloor] = useState(ALL);

  const debouncedSearch = useDebounce(search);
  const dateParam = format(day, "yyyy-MM-dd");

  const roomsQuery = useRooms();
  const bookingsQuery = useDayBookings(dateParam);

  const rooms = roomsQuery.data ?? NO_ROOMS;

  /**
   * Floors come from the rooms themselves. `location` is a free-text column, so
   * there is no floor table to read and inventing one for a select would be a
   * schema change to populate a dropdown.
   */
  const floorOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.location).filter(Boolean))]
        .sort()
        .map((location) => ({ value: location, label: location })),
    [rooms],
  );

  const isFiltered =
    Boolean(debouncedSearch) || capacity !== ALL || floor !== ALL;

  const clearFilters = () => {
    setSearch("");
    setCapacity(ALL);
    setFloor(ALL);
  };

  const visibleRooms = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return rooms.filter((room) => {
      if (floor !== ALL && room.location !== floor) return false;
      if (capacity !== ALL && room.capacity < Number(capacity)) return false;
      if (!needle) return true;
      return [room.name, room.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [rooms, debouncedSearch, capacity, floor]);

  // The orange rule marks the current time, so it belongs on today's grid only.
  // On any other day there is no "now" to point at.
  const now = isSameDay(day, new Date()) ? new Date() : null;

  const isPending = roomsQuery.isPending || bookingsQuery.isPending;
  const error = roomsQuery.error ?? bookingsQuery.error;

  return (
    <>
      <PageHeader
        title="Rooms"
        description={`${visibleRooms.length} ${
          visibleRooms.length === 1 ? "room" : "rooms"
        }, ${format(day, "EEEE d MMMM yyyy")}`}
      />

      <FilterBar isFiltered={isFiltered} onClear={clearFilters}>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous day"
            onClick={() => setDay((current) => addDays(current, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-28 text-center text-sm tabular-nums">
            {format(day, "d MMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            onClick={() => setDay((current) => addDays(current, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <FilterSelect
          value={capacity}
          onChange={setCapacity}
          options={CAPACITY_OPTIONS}
          allLabel="Any capacity"
        />
        <FilterSelect
          value={floor}
          onChange={setFloor}
          options={floorOptions}
          allLabel="All floors"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search rooms"
        />
      </FilterBar>

      {isPending ? (
        <LoadingRows rows={6} columns={4} />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            roomsQuery.refetch();
            bookingsQuery.refetch();
          }}
        />
      ) : visibleRooms.length === 0 ? (
        <ListEmptyState
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          title="No rooms yet"
          description="No rooms have been added. An admin can create one from Manage rooms."
        />
      ) : (
        <>
          <div className="flex justify-end pb-3">
            <GridLegend />
          </div>
          <DayGrid
            rooms={visibleRooms}
            bookings={bookingsQuery.data ?? []}
            now={now}
          />
          <p className="pt-4 text-xs text-muted-foreground">
            Standard operational reservation window, 08:00 to 18:00.
          </p>
        </>
      )}
    </>
  );
}

export default RoomsPage;

