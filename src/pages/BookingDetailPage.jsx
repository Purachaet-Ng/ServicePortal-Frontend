import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { differenceInMinutes, isSameDay } from "date-fns";
import { ArrowLeft, Car, Check, DoorOpen, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorState from "@/components/common/ErrorState";
import PageHeader from "@/components/common/PageHeader";
import { StatusPill } from "@/components/common/StatusChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  isBookingType,
  useBooking,
  useCancelBooking,
  useSetBookingStatus,
} from "@/features/bookings/useBookings";
import { useAuth } from "@/hooks/useAuth";
import { HOLDS_A_SLOT, ROLES } from "@/lib/constants";
import { formatDateTime, formatRelative, formatTimeRange, fullName } from "@/lib/format";

/**
 * One booking — a room or a car (WORKFLOW.md §A7).
 *
 * ONE page for both, not two. ScheduleGrid already makes this argument for the
 * availability screens: rooms and cars are the same thing with different nouns,
 * and copying the file for cars is the drift STITCH-PROMPTS §07 warns about.
 * Everything that differs between them is in RESOURCE below; nothing else in
 * this file knows which kind it is rendering.
 *
 * A card, not a board — STITCH-PROMPTS rule 1, a box means one record.
 *
 * The question this screen exists to answer is NOT "what are the hours", which
 * the grid already showed. It is "has anyone approved it yet", and 201 does not
 * mean yes. So the status carries a sentence, not just a pill.
 */

const RESOURCE = {
  room: {
    label: "Room",
    Icon: DoorOpen,
    grid: "/rooms",
    // location may be null; capacity is required by the schema.
    subtitle: (r) => [r?.location, r && `seats ${r.capacity}`].filter(Boolean).join(" · "),
    confirmed: "The room is yours for these hours.",
  },
  car: {
    label: "Car",
    Icon: Car,
    grid: "/cars",
    // Plate in tabular-nums and NOT a mono face: no monospace family carries
    // Thai, so `1กท 5678` would split its digits and its Thai glyphs across two
    // faces inside one string (STITCH-PROMPTS, "no monospace face").
    subtitle: (r) => [r && `Plate ${r.plate}`, r && `seats ${r.seats}`, r?.location].filter(Boolean).join(" · "),
    confirmed: "The vehicle is yours for these dates.",
  },
};

/**
 * "1h 30m", "45m", "1d 8h" — how long the resource is held for.
 *
 * Days are NOT rounded. A trip out from Thursday morning to Friday evening is
 * 1d 8h, and calling that "1 day" understates a vehicle's absence by a third on
 * the one screen somebody checks before asking for it.
 */
function duration(start, end) {
  const minutes = differenceInMinutes(new Date(end), new Date(start));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;

  // Minutes stop mattering once the answer is measured in days.
  if (days) return [`${days}d`, hours && `${hours}h`].filter(Boolean).join(" ");
  return [hours && `${hours}h`, rest && `${rest}m`].filter(Boolean).join(" ") || "0m";
}

export function BookingDetailPage() {
  const { type, id } = useParams();
  const location = useLocation();
  const { user, role } = useAuth();

  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const bookingQuery = useBooking(type, id);
  const cancelBooking = useCancelBooking();
  const setStatus = useSetBookingStatus();

  // A URL nobody linked to. Bail before RESOURCE[type] is read, or the whole
  // page crashes on `undefined.label` rather than saying what went wrong.
  if (!isBookingType(type)) {
    return <NotFound grid="/" />;
  }

  const kind = RESOURCE[type];
  const booking = bookingQuery.data;

  if (bookingQuery.isPending) {
    return <Skeleton className="h-80 w-full" />;
  }
  // A 404 is an answer, not an outage. Offering "Retry" for it invites the user
  // to keep asking a question that already has a final answer.
  if (bookingQuery.error?.status === 404) {
    return <NotFound grid={kind.grid} />;
  }
  if (bookingQuery.isError) {
    return <ErrorState error={bookingQuery.error} onRetry={bookingQuery.refetch} />;
  }

  const resource = booking[type];
  const holdsSlot = HOLDS_A_SLOT.includes(booking.status);
  const isMine = booking.userId === user?.id;
  const isAdmin = role === ROLES.ADMIN_DEPT || role === ROLES.ADMIN_SYSTEM;
  const isBusy = cancelBooking.isPending || setStatus.isPending;

  // Today and not yet over — the "Starting soon" treatment prompt 11 asks for.
  const startsToday = isSameDay(new Date(booking.startTime), new Date());
  const startingSoon = holdsSlot && startsToday && new Date(booking.endTime) > new Date();

  // Where Back goes. Links into this page pass state.from, so arriving from
  // /my-bookings returns you there instead of dumping you on the grid; a URL
  // opened cold falls back to the resource's own board.
  const backTo = location.state?.from ?? kind.grid;

  const cancel = () =>
    cancelBooking.mutate(
      { type, id },
      {
        onSuccess: () => {
          setConfirmingCancel(false);
          toast.success("Booking cancelled — the slot is free again.");
        },
        onError: (error) => {
          setConfirmingCancel(false);
          toast.error(error.message);
        },
      },
    );

  const decide = (status) =>
    setStatus.mutate(
      { type, id, status },
      {
        onSuccess: () => toast.success(status === "APPROVED" ? "Booking approved." : "Booking rejected."),
        onError: (error) => toast.error(error.message),
      },
    );

  return (
    <>
      <Button variant="ghost" size="md" className="mb-4" asChild>
        <Link to={backTo}>
          <ArrowLeft />
          Back
        </Link>
      </Button>

      {/*
        The resource NAMES the page. A ticket has no better title than its id,
        so TicketDetailPage uses one; a booking is about a thing with a name,
        and "Booking #88" tells the reader nothing they came here to learn.
      */}
      <PageHeader
        title={resource?.name ?? kind.label}
        description={`Booking #${booking.id} · ${kind.label}${
          resource ? ` · ${kind.subtitle(resource)}` : ""
        }`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>When</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              {/* formatTimeRange collapses a same-day booking to one date, which
                  is the room case; a car trip keeps both ends. */}
              <p className="text-2xl font-semibold tabular-nums">
                {formatTimeRange(booking.startTime, booking.endTime)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {duration(booking.startTime, booking.endTime)} ·{" "}
                {formatRelative(booking.startTime)}
              </p>

              {startingSoon && (
                <p className="mt-3 flex items-center gap-2 text-sm text-signal-text">
                  <span className="size-2 rounded-full bg-signal" aria-hidden="true" />
                  Starting soon
                </p>
              )}
            </div>

            <div className="border-t pt-6">
              <p className="mb-1 text-md text-muted-foreground">{kind.label}</p>
              <p className="font-medium">{resource?.name ?? "—"}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {resource ? kind.subtitle(resource) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              {/* The pill, not the plain word: there is no row here and so no
                  claim bar to carry the colour (StatusChip.jsx). */}
              <StatusPill kind="reservation" value={booking.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              {/*
                The load-bearing sentence. A pending booking is NOT a confirmed
                one, and 201 was never a confirmation (WORKFLOW.md §A7) — saying
                so once, in words, is the whole reason this page beats a
                hatched block on the grid.

                role="status" so it is announced after Approve or Cancel, rather
                than changing silently for anyone not watching the pill.
              */}
              <p className="text-sm text-muted-foreground" role="status">
                {booking.status === "PENDING" &&
                  "Requested, not confirmed. An admin has not approved this yet — the slot is held in the meantime."}
                {booking.status === "APPROVED" && `Confirmed. ${kind.confirmed}`}
                {booking.status === "REJECTED" &&
                  "An admin refused this request. It no longer holds the slot."}
                {booking.status === "CANCELLED" &&
                  "Withdrawn. It no longer holds the slot."}
              </p>

              <Detail label="Requested by">
                {fullName(booking.user)}
                {isMine && <span className="text-muted-foreground"> (you)</span>}
              </Detail>
              <Detail label="Requested on">{formatDateTime(booking.createdAt)}</Detail>

              {/* Only once somebody has actually decided. Rendering an em dash
                  pair on every pending booking is noise, not information. */}
              {booking.approvedAt && (
                <>
                  <Detail label={booking.status === "REJECTED" ? "Rejected by" : "Approved by"}>
                    {fullName(booking.approvedBy)}
                  </Detail>
                  <Detail label="Decided on">{formatDateTime(booking.approvedAt)}</Detail>
                </>
              )}

              {(isAdmin && booking.status === "PENDING") || (isMine && holdsSlot) ? (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {isAdmin && booking.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => decide("APPROVED")}
                      >
                        {setStatus.isPending && setStatus.variables?.status === "APPROVED" ? (
                          <Spinner />
                        ) : (
                          <Check />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => decide("REJECTED")}
                      >
                        {setStatus.isPending && setStatus.variables?.status === "REJECTED" ? (
                          <Spinner />
                        ) : (
                          <X />
                        )}
                        Reject
                      </Button>
                    </>
                  )}

                  {isMine && holdsSlot && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isBusy}
                      onClick={() => setConfirmingCancel(true)}
                    >
                      Cancel booking
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="Cancel this booking?"
        // Says what happens, not "this cannot be undone" — ConfirmDialog's own
        // doc comment asks for a sentence somebody can act on.
        description={`${resource?.name ?? kind.label}, ${formatTimeRange(
          booking.startTime,
          booking.endTime,
        )}. The slot goes back to the grid immediately and someone else can take it.`}
        confirmLabel="Cancel booking"
        isPending={cancelBooking.isPending}
        onConfirm={cancel}
      />
    </>
  );
}

/** A booking id that resolves to nothing, or a type that is not a resource. */
function NotFound({ grid }) {
  return (
    <>
      <PageHeader
        title="Booking not found"
        description="It may have been cancelled, or the link may be wrong."
      />
      <Button variant="outline" asChild>
        <Link to={grid}>
          <ArrowLeft />
          Back to availability
        </Link>
      </Button>
    </>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-md text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

export default BookingDetailPage;
