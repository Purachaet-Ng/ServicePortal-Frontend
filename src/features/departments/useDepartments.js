import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createDepartment, 
        deleteDepartment, 
        getDepartment, 
        getDepartments, 
        updateDepartment 
        } from "@/api/departments.api";

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

export const useDepartments = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["department", "list"],
    queryFn: getDepartments,
    select: (response) => {
      console.log("DEPARTMENT RESPONSE:", response);

      return Array.isArray(response)
        ? response
        : response?.departments ?? [];
    },
    staleTime: 5 * 60_000,
    enabled,
  });

// export const useDepartments= ({ enabled = true } = {}) =>
//   useQuery({
//     queryKey: ["department", "list"],
//     queryFn: getDepartments,
//     select: (response) => response?.data ?? [],
//     // Rooms are furniture — they change when someone renovates, not every
//     // thirty seconds.
//     staleTime: 5 * 60_000,
//     enabled,
//   });

/**
 * One day of bookings for the availability grid. Keyed by date so paging
 * backwards and forwards through the week hits the cache rather than the wire.
 *
 * Short staleTime, unlike the room list: someone else may have booked the slot
 * you are looking at ten seconds ago. The grid is a COURTESY view — it cannot
 * lock anything, and only POST /rooms/bookings settles a race (WORKFLOW.md A7).
 */
// export const useDayBookings = (date, { enabled = true } = {}) =>
//   useQuery({
//     queryKey: ["rooms", "bookings", date],
//     queryFn: () => getBookingsByDate(date),
//     select: (response) => response?.data ?? [],
//     staleTime: 30_000,
//     enabled: enabled && Boolean(date),
//   });

/** One room, for BookRoomPage's header. Same staleTime as the list. */
export const useDepartment= (id) =>
  useQuery({
    queryKey: ["department", "detail", Number(id)],
    queryFn: () => getDepartment(id),


    select: (response) => response?.data ?? null,
    staleTime: 5 * 60_000,
    enabled: Boolean(id),
  });

/** One room's bookings on one day — what the booking form shows as taken. */
// export const useRoomDayBookings = (id, date) =>
//   useQuery({
//     queryKey: ["rooms", "bookings", Number(id), date],
//     queryFn: () => getRoomBookings(id, date),
//     select: (response) => response?.data ?? [],
//     staleTime: 30_000,
//     enabled: Boolean(id) && Boolean(date),
//   });

/**
 * Request a room (BookRoomPage). The booking is created PENDING whatever is
 * sent — see addRoomBooking — so this is a REQUEST, not a confirmation.
 *
 * Invalidates the "rooms" prefix so the new block appears on the availability
 * grid without a reload; the grid caches per day and this page's own day query
 * lives under the same prefix.
 *
 * A 409 is the expected answer to a slot someone took first, not a failure to
 * swallow: it carries the message naming the room and hours. The page renders
 * it — see the conflict branch in BookRoomPage.
 */
// export const useCreateRoomBooking = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: createBooking,
//     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
//   });
// };

/**
 * The three admin writes (ADMIN_SYSTEM only, RoomsAdminPage).
 *
 * All of them invalidate the "rooms" PREFIX rather than ["rooms", "list"]:
 * renaming a room changes the label on the availability grid too, and
 * ["rooms", "bookings", date] holds a cached copy per day.
 */
export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department"] }),
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => updateDepartment(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department"] }),
  });
};

/** 409 when the room still has bookings — the page turns that into a sentence. */
export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["department"] }),
  });
};
