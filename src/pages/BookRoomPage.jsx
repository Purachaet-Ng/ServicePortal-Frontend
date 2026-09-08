import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import ErrorState from "@/components/common/ErrorState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateRoomBooking,
  useRoom,
  useRoomDayBookings,
} from "@/features/rooms/useRooms";
import { applyServerError } from "@/lib/formErrors";
import { fullName } from "@/lib/format";
import { bookingSchema } from "@/validators/room.validator";

/**
 * Request one room for a pair of hours on one day (WORKFLOW.md §A7).
 *
 * A card, not a board: this screen is ONE record, and STITCH-PROMPTS rule 1 is
 * that a box means one record while a ruled grid means many. The availability
 * page it came from is the grid.
 *
 * Native date and time inputs rather than a picker. The browser already does a
 * single day and an hour well, in the user's own locale and keyboard
 * conventions, and the room case needs nothing a calendar would add — unlike
 * cars, which pick a range and need booked days struck out.
 *
 * Nothing here can prevent a double booking, and it does not try. The grid is a
 * courtesy view; only POST /reserves/rooms/bookings settles a race, and the
 * exclusion constraint behind it settles the race the server's own check cannot
 * see. What this page owes the user is showing the 409 clearly when it comes.
 */

/** The operational day the grid draws — offering 03:00 here would be a lie. */
const DAY_START = "08:00";
const DAY_END = "18:00";

/** "YYYY-MM-DD" + "HH:MM" in the browser's zone, as the ISO string the API wants. */
const toIso = (date, time) => new Date(`${date}T${time}`).toISOString();

const clock = (value) => format(new Date(value), "HH:mm");

export function BookRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  /**
   * The grid hands over the cell that was clicked, so landing here from the
   * 14:00 column opens the form at 14:00. Falls back to today at 09:00 when
   * someone arrives at the URL directly.
   */
  const [defaults] = useState(() => {
    const date = params.get("date") ?? format(new Date(), "yyyy-MM-dd");
    const hour = Number(params.get("hour"));
    const start = Number.isInteger(hour) ? hour : 9;
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date,
      startTime: `${pad(start)}:00`,
      endTime: `${pad(Math.min(start + 1, 18))}:00`,
    };
  });

  const [conflict, setConflict] = useState(null);

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: defaults,
  });

  const date = watch("date");

  const roomQuery = useRoom(id);
  const dayQuery = useRoomDayBookings(id, date);
  const mutation = useCreateRoomBooking();

  // Any edit is a new proposal, so a conflict about the previous one is stale
  // and must not sit there looking like it still applies.
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  useEffect(() => setConflict(null), [date, startTime, endTime]);

  const room = roomQuery.data;

  const onSubmit = (values) => {
    setConflict(null);
    mutation.mutate(
      {
        roomId: Number(id),
        // Required by createRoomBookingSchema and then ignored by the service —
        // every booking starts PENDING. Sending anything else would be refused
        // by the validator, not honoured.
        status: "PENDING",
        startTime: toIso(values.date, values.startTime),
        endTime: toIso(values.date, values.endTime),
      },
      {
        onSuccess: () => {
          toast.success(`${room?.name ?? "Room"} requested — awaiting approval`);
          // Back to the grid, where the new block is already drawn hatched.
          // NOT /my-bookings, which is still a placeholder.
          navigate(`/rooms?q=${encodeURIComponent(room?.name ?? "")}`);
        },
        onError: (error) =>
          applyServerError(error, {
            setError,
            setConflict,
            fields: ["date", "startTime", "endTime"],
          }),
      },
    );
  };

  if (roomQuery.isError) {
    return (
      <>
        <PageHeader title="Book a room" />
        <ErrorState error={roomQuery.error} onRetry={roomQuery.refetch} />
      </>
    );
  }

  const taken = dayQuery.data ?? [];

  return (
    <>
      <PageHeader
        title={roomQuery.isPending ? "Book a room" : `Book ${room?.name}`}
        description={
          room
            ? [room.location, `seats ${room.capacity}`].filter(Boolean).join(", ")
            : "Pick a day and a pair of hours."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  className="tabular-nums"
                  aria-invalid={!!errors.date}
                  {...field("date")}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startTime">From</Label>
                  <Input
                    id="startTime"
                    type="time"
                    step={900}
                    min={DAY_START}
                    max={DAY_END}
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
                  <Label htmlFor="endTime">To</Label>
                  <Input
                    id="endTime"
                    type="time"
                    step={900}
                    min={DAY_START}
                    max={DAY_END}
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

              {/*
                The conflict. role="alert" so a screen reader announces it —
                the submit button does not move, so a sighted user sees a new
                banner but a blind one would otherwise get silence.
              */}
              {conflict && (
                <Alert variant="destructive" role="alert">
                  <TriangleAlert />
                  <AlertTitle>That slot is taken</AlertTitle>
                  <AlertDescription>{conflict}</AlertDescription>
                </Alert>
              )}

              {errors.root && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.root.message}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Spinner />}
                  Request room
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/rooms")}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Requesting does not confirm anything. The booking is created
                pending and an admin approves it.
              </p>
            </form>
          </CardContent>
        </Card>

        {/*
          What is already taken that day, so a clash is visible BEFORE
          submitting rather than only in the 409 afterwards. A ruled list, not
          a second card — these are many records.
        */}
        <div>
          <h2 className="pb-3 text-sm font-medium">
            Already booked{date ? ` on ${format(new Date(date), "d MMM yyyy")}` : ""}
          </h2>

          {dayQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : taken.length === 0 ? (
            <p className="border-t py-3 text-sm text-muted-foreground">
              Nothing yet — the whole day is free.
            </p>
          ) : (
            <ul className="border-t">
              {taken
                .slice()
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                .map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-center justify-between border-b py-3 text-sm"
                  >
                    <span className="tabular-nums">
                      {clock(booking.startTime)} – {clock(booking.endTime)}
                    </span>
                    <span className="text-muted-foreground">
                      {booking.user ? fullName(booking.user) : "Booked"}
                      {booking.status === "PENDING" && " (requested)"}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default BookRoomPage;
