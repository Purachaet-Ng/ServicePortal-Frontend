import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, differenceInCalendarDays, format, startOfDay } from "date-fns";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import ErrorState from "@/components/common/ErrorState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  useCar,
  useCarBookings,
  useCreateCarBooking,
} from "@/features/cars/useCars";
import { applyServerError } from "@/lib/formErrors";
import { carBookingSchema } from "@/validators/car.validator";

/**
 * Request one vehicle for a trip (WORKFLOW.md §A7).
 *
 * A range calendar, not a date field, because a car booking is days rather than
 * hours — and because the days a vehicle is already out can be struck out on it.
 * That is the difference that earns the component over a native input here:
 * on the room form a clash is only discoverable by submitting, whereas here an
 * unavailable day cannot be clicked in the first place.
 *
 * It is still only a courtesy. The disabled days come from a cache that may be
 * seconds old, and the thing that actually refuses a clash is the 409 from
 * addCarBooking plus the car_bookings_no_overlap constraint behind it. The
 * calendar removes the common mistake; the server removes the race.
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

const HOLDS_A_SLOT = new Set(["PENDING", "APPROVED"]);

/** Every calendar day a live trip touches — what the picker strikes out. */
function bookedDays(bookings) {
  const days = [];
  for (const booking of bookings) {
    if (!HOLDS_A_SLOT.has(booking.status)) continue;
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
        onSuccess: () => {
          toast.success(`${car?.name ?? "Vehicle"} requested — awaiting approval`);
          navigate(`/cars?q=${encodeURIComponent(car?.name ?? "")}`);
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

      <Card className="max-w-3xl">
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
                    numberOfMonths={2}
                    month={month}
                    onMonthChange={setMonth}
                    selected={rhf.value}
                    onSelect={rhf.onChange}
                    // Past days and every day a live trip touches. The picker
                    // will not build a range across a disabled day, so an
                    // unavailable trip cannot be composed here at all.
                    disabled={[{ before: startOfDay(new Date()) }, ...disabledDays]}
                    excludeDisabled
                    className="rounded-md border"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Struck-out days are already booked or in the past. Pick a
                departure day, then a return day — the same day for a single-day
                trip.
              </p>
              {errors.range && (
                <p className="text-xs text-destructive">
                  {errors.range.message ?? errors.range.from?.message}
                </p>
              )}
            </div>

            <div className="grid max-w-sm grid-cols-2 gap-3">
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

            {from && to && (
              <p className="text-sm tabular-nums">
                {format(from, "EEE d MMM")} {startTime} → {format(to, "EEE d MMM")}{" "}
                {endTime}
                <span className="text-muted-foreground">
                  {" "}
                  · {nights === 0 ? "same day" : `${nights + 1} days`}
                </span>
              </p>
            )}

            {conflict && (
              <Alert variant="destructive" role="alert">
                <TriangleAlert />
                <AlertTitle>That vehicle is taken</AlertTitle>
                <AlertDescription>{conflict}</AlertDescription>
              </Alert>
            )}

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
    </>
  );
}

export default BookCarPage;
