import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyBookings, getPendingBookings } from "@/api/bookings.api";
import {
  cancelCarBooking,
  getCarBooking,
  setCarBookingStatus,
} from "@/api/cars.api";
import {
  cancelRoomBooking,
  getRoomBooking,
  setRoomBookingStatus,
} from "@/api/rooms.api";

/**
 * The bookings module's query layer.
 *
 *   ["bookings", "mine"]        rooms and cars you have claimed
 *   ["bookings", "pending"]     the admin approval queue
 *   ["bookings", type, id]      one booking, with its resource and requester
 *
 * `type` is part of the key and not decoration: booking ids are only unique
 * within their own table, so ["bookings", 88] would collide room booking 88
 * with car booking 88 and serve one page the other's data.
 */

/**
 * Which api function answers for which noun. The rest of this file, and the
 * detail page, then never branch on the string again.
 */
const BY_TYPE = {
  room: { get: getRoomBooking, cancel: cancelRoomBooking, setStatus: setRoomBookingStatus },
  car: { get: getCarBooking, cancel: cancelCarBooking, setStatus: setCarBookingStatus },
};

export const isBookingType = (type) => type in BY_TYPE;

/**
 * One booking. Everything the detail page names is in this one response — the
 * backend includes the room/car, the requester and the approver — so there is
 * deliberately no second useRoom()/useCar() call beside it.
 *
 * `retry: false` on a 404. React Query's default is three attempts, and a
 * booking that does not exist will not start existing on the third: the user
 * would watch a skeleton for several seconds to be told the same thing.
 */
export const useBooking = (type, id) =>
  useQuery({
    queryKey: ["bookings", type, Number(id)],
    queryFn: () => BY_TYPE[type].get(id),
    select: (response) => response?.data ?? null,
    enabled: Boolean(id) && isBookingType(type),
    retry: (count, error) => error?.status !== 404 && count < 2,
  });

/**
 * Your own bookings, both kinds, for the My bookings board.
 *
 * Short staleTime for the same reason the availability grids have one: an admin
 * may have approved or rejected something while this tab sat open, and the
 * status column is the whole point of the screen.
 */
export const useMyBookings = () =>
  useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: getMyBookings,
    select: (response) => response?.data ?? [],
    staleTime: 30_000,
  });

/**
 * The approval queue. Same short staleTime as the list, and for a sharper
 * reason: two admins may be working the same queue, and approving a row
 * somebody else already settled is the mistake this screen can actually make.
 */
export const usePendingBookings = () =>
  useQuery({
    queryKey: ["bookings", "pending"],
    queryFn: getPendingBookings,
    select: (response) => response?.data ?? [],
    staleTime: 30_000,
  });

/**
 * Both writes invalidate THREE prefixes, and all three are needed:
 *
 *   ["bookings"]   this booking's own detail, and the My bookings list
 *   ["rooms"]      the room availability grid, cached per day
 *   ["cars"]       the car availability grid, cached per car per month
 *
 * Cancelling or rejecting FREES A SLOT. Refreshing only the booking would leave
 * the grid drawing a block over an hour that is now bookable — the exact
 * failure the grid's own comments call the worst mistake that screen can make,
 * arrived at from the other direction.
 */
const invalidateEverythingTouched = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["bookings"] });
  queryClient.invalidateQueries({ queryKey: ["rooms"] });
  queryClient.invalidateQueries({ queryKey: ["cars"] });
};

/** The owner withdraws their own booking. 403 if not theirs, 409 if settled. */
export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }) => BY_TYPE[type].cancel(id),
    onSuccess: () => invalidateEverythingTouched(queryClient),
  });
};

/** Admin approve / reject (ADMIN_DEPT, ADMIN_SYSTEM). */
export const useSetBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, status }) => BY_TYPE[type].setStatus(id, status),
    onSuccess: () => invalidateEverythingTouched(queryClient),
  });
};
