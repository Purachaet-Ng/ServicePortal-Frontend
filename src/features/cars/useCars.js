import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createBooking,
  createCar,
  deleteCar,
  getCar,
  getCarAvailability,
  getCars,
  updateCar,
} from "@/api/cars.api";

/**
 * The cars module's query layer (WORKFLOW.md §B4 step 3).
 *
 *   ["cars", "list"]                       every car
 *   ["cars", "availability", id, month]    one car, one month of bookings
 *
 * GET /api/reserves/cars takes no params and returns the whole table, so there
 * is one list query and its key carries no params object — same situation as
 * useRooms and useUsers. `select` unwraps the { success, data } envelope here,
 * once.
 */
export const useCars = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["cars", "list"],
    queryFn: getCars,
    select: (response) => response?.data ?? [],
    // A fleet changes when someone buys or sells a vehicle, not every thirty
    // seconds. Same reasoning as rooms.
    staleTime: 5 * 60_000,
    enabled,
  });

/**
 * Every car's bookings across `months`, as a single flat array.
 *
 * Rooms get their whole day in one call — GET /reserves/rooms/bookings?date=.
 * There is no car equivalent: /reserves/cars/:id/availability is per car. So
 * this fans out with useQueries, one query per car per month. A fleet is a
 * handful of vehicles, not a table of thousands, and each response is a month
 * of one car's bookings — a few rows.
 *
 * `months` is a LIST because the Cars page draws a rolling window of days, and
 * any window longer than a day lands across a month boundary sooner or later.
 * The endpoint only speaks whole calendar months (see getCarAvailability), so
 * a window from 28 September to 11 October is two fetches per car, merged here.
 *
 * Keyed per month, which is the good half of that bargain: stepping the window
 * forward re-uses every month already in cache and only pays for the new one.
 *
 * Pass EVERY car, never the filtered subset — the search box would otherwise
 * mount and unmount queries on each keystroke.
 */
export const useCarBookings = (cars, months) =>
  useQueries({
    queries: (cars ?? []).flatMap((car) =>
      (months ?? []).map((month) => ({
        queryKey: ["cars", "availability", car.id, month],
        queryFn: () => getCarAvailability(car.id, month),
        select: (response) => response?.data ?? [],
        // Short, unlike the car list: someone else may have booked the days you
        // are looking at ten seconds ago. The grid is a COURTESY view — it
        // cannot lock anything (WORKFLOW.md A7), and for cars not even the POST
        // does: addCarBooking has no overlap guard and car_bookings has no
        // exclusion constraint, so overlaps are possible and assignLanes has to
        // draw them.
        staleTime: 30_000,
        enabled: Boolean(month),
      })),
    ),
    combine: (results) => ({
      /**
       * DEDUPED BY ID, and that is not defensive tidying — it is required.
       *
       * The backend selects bookings that OVERLAP the requested month, not ones
       * that start in it, so a trip running 28 September to 4 October comes
       * back from the 2026-09 query AND the 2026-10 query. Flat-mapping alone
       * yields the same row twice, assignLanes cannot tell a duplicate from a
       * genuine double booking, and the grid draws the trip as two stacked
       * half-height blocks — which reads as two vehicles-worth of claim on one
       * car. Every window straddling the 1st hit this.
       */
      data: [
        ...new Map(
          results.flatMap((result) =>
            (result.data ?? []).map((booking) => [booking.id, booking]),
          ),
        ).values(),
      ],
      isPending: results.some((result) => result.isPending),
      error: results.find((result) => result.error)?.error ?? null,
      refetch: () => results.forEach((result) => result.refetch()),
    }),
  });

/** One car, for BookCarPage's header. Same staleTime as the list. */
export const useCar = (id) =>
  useQuery({
    queryKey: ["cars", "detail", Number(id)],
    queryFn: () => getCar(id),
    select: (response) => response?.data ?? null,
    staleTime: 5 * 60_000,
    enabled: Boolean(id),
  });

/**
 * Request a vehicle (BookCarPage). Created PENDING whatever is sent, exactly
 * like rooms — addCarBooking ignores the status field the schema demands.
 *
 * As of the car_bookings_no_overlap migration this can answer 409
 * CAR_UNAVAILABLE, which it could not before: the calendar disables booked days,
 * but the server is what actually holds the line.
 */
export const useCreateCarBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
};

/**
 * The three admin writes (ADMIN_SYSTEM only, CarsAdminPage).
 *
 * All of them invalidate the "cars" PREFIX rather than ["cars", "list"]:
 * renaming a car changes the label on the availability grid too, and
 * ["cars", "availability", id, month] holds a cached copy per car per month.
 */
export const useCreateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
};

export const useUpdateCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => updateCar(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
};

/** 409 when the car still has bookings — the page turns that into a sentence. */
export const useDeleteCar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cars"] }),
  });
};
