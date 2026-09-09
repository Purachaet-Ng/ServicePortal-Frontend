import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import ErrorState from "@/components/common/ErrorState";
import { StatusChip } from "@/components/common/StatusChip";
import BookingConflict from "@/components/reserve/BookingConflict";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useCar,
  useCarBookings,
  useCreateCarBooking,
} from "@/features/cars/useCars";
import { useIsMobile } from "@/hooks/use-mobile";
import { HOLDS_A_SLOT } from "@/lib/constants";
import { applyServerError } from "@/lib/formErrors";
import { formatTimeRange } from "@/lib/format";
import { carBookingSchema } from "@/validators/car.validator";

/**
 * Request one vehicle for a trip (WORKFLOW.md §A7).
 *
 * A SLIP — one bounded record, and the 3px violet rule across its top edge that
 * STITCH-PROMPTS gives every single-record screen. The calendar sits directly
 * on it: a bordered box inside the card is the "boxes nested inside a slip"
 * mistake the design doc names in its own troubleshooting table.
 *
 * A range calendar, not a date field, because a car booking is days rather than
 * hours — and because the days a vehicle is already out can be struck out on
 * it. That is the difference that earns the component over a native input here:
 * on the room form a clash is only discoverable by submitting, whereas here an
 * unavailable day cannot be clicked in the first place.
 *
 * It is still only a courtesy. The disabled days come from a cache that may be
 * seconds old, and the thing that actually refuses a clash is the 409 from
 * addCarBooking plus the car_bookings_no_overlap constraint behind it. The
 * calendar removes the common mistake; the server removes the race; and when
 * the server wins, BookingConflict names the trip that got there first.
 *
 * The right column is the other half of that courtesy. A struck-out day says
 * "no" and nothing else — not how long the vehicle is gone, not whether the
 * trip holding it is merely requested. The list says both, and links to the
 * booking that can say who.
 */

/** A trip inside the working day unless someone says otherwise. */
const DEFAULT_DEPART = "08:00";
const DEFAULT_RETURN = "18:00";

/** "HH:MM" onto a Date, as the ISO string the API wants. */
const toIso = (day, time) => {
  const [hours, minutes] = time.split(":").map(Number);
  const at = new Date(day);
  at.setHours(hours, minutes, 0, 0);
  return at.toISOString();
};

/** Every calendar day a live trip touches — what the picker strikes out. */
function bookedDays(bookings) {
  const days = [];
  for (const booking of bookings) {
    if (!HOLDS_A_SLOT.includes(booking.status)) continue;
    const first = startOfDay(new Date(booking.startTime));
    const last = startOfDay(new Date(booking.endTime));
    // Inclusive of the last day: a van returning Friday morning is still
    // unavailable for a trip that wants to leave Friday morning. Rounding OUT,
    // the same direction the grid snaps blocks — it can cost you an afternoon,
    // never hand you a vehicle that is not there.
    for (let i = 0; i <= differenceInCalendarDays(last, first); i++) {
      const day = new Date(first);
      day.setDate(first.getDate() + i);
      days.push(day);
    }
  }
  return days;
}

export function BookCarPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isMobile = useIsMobile();

  const [conflict, setConflict] = useState(null);
  /** The month the calendar is showing, so availability follows the user. */
  const [month, setMonth] = useState(() => {
    const seeded = params.get("date");
    return seeded ? new Date(seeded) : new Date();
  });

  const {
    control,
    register: field,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(carBookingSchema),
    defaultValues: {
      // The grid hands over the day whose cell was clicked, as a one-day trip
      // the user can then drag longer.
      range: params.get("date")
        ? { from: startOfDay(new Date(params.get("date"))), to: undefined }
        : undefined,
      startTime: DEFAULT_DEPART,
      endTime: DEFAULT_RETURN,
    },
  });

  const carQuery = useCar(id);
  const car = carQuery.data;

  /**
   * Availability for the month on screen and the next one, so a range dragged
   * across a month boundary is checked against real data on both sides. Reuses
   * the fleet hook with a one-car array — no second fetch path to keep in step.
   */
  const months = useMemo(
    () => [format(month, "yyyy-MM"), format(addMonths(month, 1), "yyyy-MM")],
    [month],
  );
  const carList = useMemo(() => (car ? [car] : []), [car]);
  const bookingsQuery = useCarBookings(carList, months);

  const disabledDays = useMemo(
    () => bookedDays(bookingsQuery.data ?? []),
    [bookingsQuery.data],
  );

  /**
   * The same rows the calendar greys out, as a readable list. Ended trips are
   * dropped — this answers "when can I have it", and last month's errand is
   * not part of that question.
   */
  const upcomingTrips = useMemo(() => {
    const now = Date.now();
    return (bookingsQuery.data ?? [])
      .filter(
        (booking) =>
          HOLDS_A_SLOT.includes(booking.status) &&
          new Date(booking.endTime).getTime() >= now,
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [bookingsQuery.data]);

  const range = watch("range");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const from = range?.from;
  // One click is a single-day trip — see carBookingSchema.
  const to = range?.to ?? range?.from;

  // Any edit is a new proposal; a conflict about the previous one is stale.
  useEffect(() => setConflict(null), [from, to, startTime, endTime]);

  const mutation = useCreateCarBooking();

  const onSubmit = (values) => {
    setConflict(null);
    mutation.mutate(
      {
        carId: Number(id),
        // Required by createCarBookingSchema, then ignored by addCarBooking.
        status: "PENDING",
        startTime: toIso(values.range.from, values.startTime),
        endTime: toIso(values.range.to ?? values.range.from, values.endTime),
      },
      {
        onSuccess: (response) => {
          toast.success(`${car?.name ?? "Vehicle"} requested — awaiting approval`);
          // The booking, not the grid — see the room twin for why.
          navigate(`/bookings/car/${response.data.id}`, {
            state: { from: `/cars?q=${encodeURIComponent(car?.name ?? "")}` },
          });
        },
        onError: (error) =>
          applyServerError(error, {
            setError,
            setConflict,
            fields: ["range", "startTime", "endTime"],
          }),
      },
    );
  };

  if (carQuery.isError) {
    return (
      <>
        <PageHeader title="Book a car" />
        <ErrorState error={carQuery.error} onRetry={carQuery.refetch} />
      </>
    );
  }

  const nights = from && to ? differenceInCalendarDays(to, from) : null;

  return (
    <>
      <PageHeader
        title={carQuery.isPending ? "Book a car" : `Book ${car?.name}`}
        description={
          car
            ? [car.plate, `${car.seats} seats`, car.location]
                .filter(Boolean)
                .join(" · ")
            : "Pick the days the vehicle is needed."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        {/* The slip. The top rule is what says "this is one record" — see the
            slip definition at the head of STITCH-PROMPTS' slip section. */}
        <Card className="border-t-[3px] border-t-primary">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label>Trip dates</Label>
                <Controller
                  control={control}
                  name="range"
                  render={({ field: rhf }) => (
                    <Calendar
                      mode="range"
                      // Two months is a fortnight of planning at a glance, but
                      // on a phone it is a sideways scroll through half a grid.
                      numberOfMonths={isMobile ? 1 : 2}
                      month={month}
                      onMonthChange={setMonth}
                      selected={rhf.value}
                      onSelect={rhf.onChange}
                      // Past days and every day a live trip touches. The picker
                      // will not build a range across a disabled day, so an
                      // unavailable trip cannot be composed here at all.
                      disabled={[{ before: startOfDay(new Date()) }, ...disabledDays]}
                      excludeDisabled
                      // No border and no radius of its own: the slip is the box.
                      className="w-full p-0"
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Pick a departure day, then a return day — the same day for a
                  single-day trip. Struck-out days are in the past or already
                  taken.
                </p>
                {errors.range && (
                  <p className="text-xs text-destructive">
                    {errors.range.message ?? errors.range.from?.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-5">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Departs</Label>
                  <Input
                    id="startTime"
                    type="time"
                    step={900}
                    className="tabular-nums"
                    aria-invalid={!!errors.startTime}
                    {...field("startTime")}
                  />
                  {errors.startTime && (
                    <p className="text-xs text-destructive">
                      {errors.startTime.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Returns</Label>
                  <Input
                    id="endTime"
                    type="time"
                    step={900}
                    className="tabular-nums"
                    aria-invalid={!!errors.endTime}
                    {...field("endTime")}
                  />
                  {errors.endTime && (
                    <p className="text-xs text-destructive">
                      {errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Always rendered, even with nothing picked yet. This used to
                  mount only once a range existed, which pushed the submit
                  button down the screen at the moment the user was reaching for
                  it. A composer's own readout must not move. */}
              <div className="border-t pt-5">
                {from && to ? (
                  <p className="text-sm tabular-nums">
                    {format(from, "EEE d MMM")} {startTime} →{" "}
                    {format(to, "EEE d MMM")} {endTime}
                    <span className="text-muted-foreground">
                      {" "}
                      · {nights === 0 ? "same day" : `${nights + 1} days`}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pick a departure day to see the trip here.
                  </p>
                )}
              </div>

              <BookingConflict conflict={conflict} type="car" />

              {errors.root && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.message}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Spinner />}
                  Request vehicle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/cars")}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Requesting does not confirm anything. The trip is created pending
                and an admin approves it.
              </p>
            </form>
          </CardContent>
        </Card>

        {/*
          What is already on this vehicle. A ruled list and not a second card —
          many records, so the structure is the rules.

          Built from the data the calendar already fetched, so this costs no
          request. The rows carry no requester: the car availability endpoint
          returns raw car_bookings with no user relation, unlike the room day
          read. The booking each row links to does have one.
        */}
        <div>
          <h2 className="pb-3 text-sm font-medium">Already booked</h2>

          {bookingsQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : upcomingTrips.length === 0 ? (
            <p className="border-t py-3 text-sm text-muted-foreground">
              Nothing booked in this period — the vehicle is free.
            </p>
          ) : (
            <ul className="border-t">
              {upcomingTrips.map((booking) => (
                <li key={booking.id}>
                  <Link
                    to={`/bookings/car/${booking.id}`}
                    state={{ from: `/cars/${id}/book` }}
                    className="flex items-center justify-between gap-3 border-b py-3 text-sm hover:bg-accent/50"
                  >
                    <span className="tabular-nums">
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                    <StatusChip kind="reservation" value={booking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default BookCarPage;
