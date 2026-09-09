import { Link } from "react-router-dom";
import { formatTimeRange } from "@/lib/format";

/**
 * "Someone already has it" — the 409, for rooms AND cars.
 *
 * One component and not two because STITCH-PROMPTS prompt 08 is one prompt for
 * both nouns: the clash state is the hardest part of that screen to get right,
 * and two copies would drift into two different-looking refusals of the same
 * thing.
 *
 * A 3px rule down the LEFT edge over a tint, rather than <Alert
 * variant="destructive">. That variant is `bg-card text-destructive` — no tint
 * and no rule — and an icon-led filled banner is louder than this needs to be.
 * There is deliberately no warning triangle either: the rule and the red
 * headline already say "refused" twice, and prompt 08 asks for no icon.
 *
 * THE POINT OF THIS COMPONENT is the third line. The backend attaches the
 * blocking booking to every clash it can name — `details: [{ bookingId,
 * startTime, endTime }]`, see addCarBooking — specifically so the UI can show
 * what is in the way instead of making the requester go hunting. That was dead
 * data until /bookings/:type/:id existed to link to.
 *
 * `blocking` can be absent, and the component must survive it: the
 * exclusion-constraint catch answers 409 with a message and no details, because
 * by then the losing row is all the server knows. Two lines, not three, and
 * never an empty one.
 */

const HINT = {
  room: "Pick a different time or room.",
  car: "Pick different dates.",
};

export function BookingConflict({ conflict, type }) {
  if (!conflict) return null;

  const blocking = conflict.blocking;

  return (
    // role="alert" so this is announced. The submit button does not move when
    // it appears, so a sighted user sees a new banner and a blind one would
    // otherwise get silence.
    <div
      role="alert"
      className="space-y-1 rounded-r-md border-l-[3px] border-l-destructive bg-destructive/8 px-3 py-2.5"
    >
      {/* The server's sentence, not one written here: it names the resource and
          the exact hours or days, which the client cannot reconstruct. */}
      <p className="text-sm font-medium text-destructive">{conflict.message}</p>

      {blocking && (
        <p className="text-sm tabular-nums">
          {formatTimeRange(blocking.startTime, blocking.endTime)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {HINT[type]}{" "}
        {blocking && (
          <Link
            to={`/bookings/${type}/${blocking.bookingId}`}
            className="text-primary underline underline-offset-2"
          >
            View that booking
          </Link>
        )}
      </p>
    </div>
  );
}

export default BookingConflict;
