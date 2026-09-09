import { Link } from "react-router";

import { cn } from "@/lib/utils";
import { fullName } from "@/lib/format";
import { assignLanes } from "./lanes";

/**
 * The reserve availability day grid (STITCH-PROMPTS.md §10) — rooms AND cars.
 *
 * No card, no border around the whole thing — the structure IS the rules.
 * Resources down a 180px gutter, hours across the top, one absolutely-positioned
 * block per booking.
 *
 * One component, two resources, because STITCH-PROMPTS §07 says so: rooms and
 * cars are "the same screen with different nouns", and generating them
 * separately only creates drift. The four things that actually differ are
 * props:
 *
 *   resources    the rows — rooms or cars, each { id, name, ... }
 *   bookingKey   the scalar joining a booking to its row: "roomId" | "carId"
 *   subtitle     (resource) => the second line under the name
 *   bookHref     (resource) => where an empty cell books it
 *   day          the Date being drawn — see asOffset, it is not cosmetic
 *
 * A PENDING booking is drawn hatched, NOT as free space. That is the single
 * worst mistake this screen can make: the grid would look clear right up until
 * someone's request is rejected for a conflict they could not see.
 *
 * ponytail: hours are read in the BROWSER's timezone, which is +07:00 for
 * everyone in the office — the same assumption formatTime() already makes
 * app-wide. If this ever renders for someone abroad, convert here and in
 * lib/format together, not just here.
 */
const START_HOUR = 8;
const END_HOUR = 18;
const SPAN = END_HOUR - START_HOUR;

const HOURS = Array.from({ length: SPAN }, (_, i) => START_HOUR + i);

/**
 * Hours since the VISIBLE DAY's START_HOUR, as a fraction of the band, clamped
 * to it.
 *
 * `day` is load-bearing and this used to read `date.getHours()` alone. That is
 * right only while a booking begins and ends on the day being drawn — true of
 * every room booking, because the rooms endpoint returns one day and nobody
 * books a meeting room overnight. It is NOT true of cars: a vehicle goes out on
 * a trip, and there is a live booking running 14 September to 17 October.
 *
 * Reading the clock alone, both ends of that trip land at the same fraction, so
 * `width` came out zero and the block was dropped as out-of-band — the row drew
 * FREE for a car that is away for a month. Measuring from the day's own 08:00
 * clamps such a booking to the two edges instead, and leaves same-day maths
 * bit-for-bit unchanged.
 */
const asOffset = (date, day) => {
  const windowStart = new Date(day);
  windowStart.setHours(START_HOUR, 0, 0, 0);
  const hours = (date.getTime() - windowStart.getTime()) / 3_600_000;
  return Math.min(Math.max(hours / SPAN, 0), 1);
};

const pad = (n) => String(n).padStart(2, "0");
const clockOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function BookingBlock({ booking, lane, lanes, day }) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  const left = asOffset(start, day);
  const width = asOffset(end, day) - left;

  // A booking entirely outside 08:00-18:00 has nowhere to go. Drop it rather
  // than draw a zero-width sliver pinned to the edge, which reads as a block
  // starting at 08:00 and is worse than showing nothing.
  if (width <= 0) return null;

  const isApproved = booking.status === "APPROVED";
  // Test the user, not the formatted string: fullName(null) is "—", which is
  // truthy, so `fullName(...) || "Booked"` never reached its fallback. Room
  // bookings always arrive with their user and read the same either way; the
  // car availability endpoint does not include one, and every block on that
  // grid was rendering as a lone em dash.
  const label = booking.user ? fullName(booking.user) : "Booked";

  return (
    <div
      className={cn(
        "absolute flex items-center overflow-hidden rounded-[4px] px-2",
        isApproved
          ? "bg-primary text-primary-foreground"
          : "border border-primary bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--primary)_4px,var(--primary)_5px)] text-primary",
      )}
      style={{
        left: `${left * 100}%`,
        width: `${width * 100}%`,
        // Share the row's height with anything it overlaps, so a double booking
        // reads as two blocks rather than hiding one behind the other.
        top: `calc(${(lane / lanes) * 100}% + 2px)`,
        height: `calc(${(1 / lanes) * 100}% - 4px)`,
      }}
      title={`${label}, ${clockOf(start)} to ${clockOf(end)}${
        isApproved ? "" : " (requested)"
      }`}
    >
      <span
        className={cn(
          "truncate text-xs",
          !isApproved && "rounded-[2px] bg-background/85 px-1",
        )}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * The orange "you are here" rule. Only meaningful on today's grid.
 *
 * bg-signal, not the #C2410C literal it used to be. The literal predated dark
 * mode ever rendering, and a hex cannot follow a theme — the dark block lifts
 * --signal to oklch(0.69 0.17 42) precisely so the now-line still reads as an
 * interruption against a near-black ground.
 */
function NowLine({ now }) {
  // `now` is only ever passed on today's grid, so it is its own day.
  const offset = asOffset(now, now);
  if (offset <= 0 || offset >= 1) return null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-signal"
      style={{ left: `calc(180px + (100% - 180px) * ${offset})` }}
      aria-hidden="true"
    >
      <span className="absolute -top-6 -translate-x-1/2 rounded-[2px] bg-signal px-1 text-[11px] tabular-nums text-signal-foreground">
        {clockOf(now)}
      </span>
    </div>
  );
}

export function DayGrid({
  resources,
  bookings,
  bookingKey,
  subtitle,
  bookHref,
  day,
  now,
}) {
  const byResource = new Map(resources.map((resource) => [resource.id, []]));
  for (const booking of bookings) {
    byResource.get(booking[bookingKey])?.push(booking);
  }

  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[860px]">
        {/* Hour labels. The 180px gutter keeps them over their own columns. */}
        <div className="flex pb-2 pl-[180px]">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-1 text-xs tabular-nums text-muted-foreground"
            >
              {pad(hour)}:00
            </div>
          ))}
        </div>

        <div className="relative border-t">
          {resources.map((resource) => (
            <div key={resource.id} className="flex border-b">
              <div className="w-[180px] shrink-0 py-3 pr-4">
                <p className="truncate text-sm">{resource.name}</p>
                {/* tabular-nums, and deliberately NOT monospace: no mono face
                    carries Thai, so a plate like `1กท 5678` would render its
                    digits and its Thai glyphs in different faces inside one
                    string (STITCH-PROMPTS.md, "no monospace face"). */}
                <p className="truncate text-xs tabular-nums text-muted-foreground">
                  {subtitle(resource)}
                </p>
              </div>

              <div className="relative min-h-[52px] flex-1">
                {/* Empty hour cells: they draw the vertical rules AND are the
                    way into the booking form. The grid IS the resource picker
                    — there is no route that books "a room" without one. */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <Link
                      key={hour}
                      to={bookHref(resource)}
                      aria-label={`Book ${resource.name} at ${pad(hour)}:00`}
                      className="group flex flex-1 items-center justify-center border-l text-muted-foreground"
                    >
                      <span className="text-sm opacity-0 transition-opacity group-hover:opacity-40">
                        +
                      </span>
                    </Link>
                  ))}
                </div>

                {assignLanes(byResource.get(resource.id) ?? []).map(
                  ({ booking, lane, lanes }) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      lane={lane}
                      lanes={lanes}
                      day={day}
                    />
                  ),
                )}
              </div>
            </div>
          ))}

          {now && <NowLine now={now} />}
        </div>
      </div>
    </div>
  );
}

export function GridLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[2px] bg-primary" />
        Confirmed
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-[2px] border border-primary bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,var(--primary)_2px,var(--primary)_3px)]" />
        Requested
      </span>
    </div>
  );
}

export default DayGrid;

