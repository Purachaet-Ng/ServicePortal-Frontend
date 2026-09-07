import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoom,
  deleteRoom,
  getBookingsByDate,
  getRooms,
  updateRoom,
} from "@/api/rooms.api";

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

/**
 * The three admin writes (ADMIN_SYSTEM only, RoomsAdminPage).
 *
 * All of them invalidate the "rooms" PREFIX rather than ["rooms", "list"]:
 * renaming a room changes the label on the availability grid too, and
 * ["rooms", "bookings", date] holds a cached copy per day.
 */
export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => updateRoom(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });
};

/** 409 when the room still has bookings — the page turns that into a sentence. */
export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  });
};
