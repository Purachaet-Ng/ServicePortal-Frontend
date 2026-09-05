import { useQuery } from "@tanstack/react-query";
import { getBookingsByDate, getRooms } from "@/api/rooms.api";

/**
 * The rooms module's query layer (WORKFLOW.md §B4 step 3).
 *
 *   ["rooms", "list"]              every room
 *   ["rooms", "bookings", date]    one day of bookings, every room
 *
 * GET /api/reserves/rooms takes no params and returns the whole table, so there
 * is one list query and its key carries no params object — same situation as
 * useUsers. `select` unwraps the { success, data } envelope here, once.
 */
export const useRooms = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["rooms", "list"],
    queryFn: getRooms,
    select: (response) => response?.data ?? [],
    // Rooms are furniture — they change when someone renovates, not every
    // thirty seconds.
    staleTime: 5 * 60_000,
    enabled,
  });

/**
 * One day of bookings for the availability grid. Keyed by date so paging
 * backwards and forwards through the week hits the cache rather than the wire.
 *
 * Short staleTime, unlike the room list: someone else may have booked the slot
 * you are looking at ten seconds ago. The grid is a COURTESY view — it cannot
 * lock anything, and only POST /rooms/bookings settles a race (WORKFLOW.md A7).
 */
export const useDayBookings = (date, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["rooms", "bookings", date],
    queryFn: () => getBookingsByDate(date),
    select: (response) => response?.data ?? [],
    staleTime: 30_000,
    enabled: enabled && Boolean(date),
  });

