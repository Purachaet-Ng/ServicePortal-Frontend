import { Link } from "react-router";

import { cn } from "@/lib/utils";
import { fullName } from "@/lib/format";
import { assignLanes } from "./lanes";
import { clockOf } from "./columns";

/**
 * The reserve availability grid (STITCH-PROMPTS.md §10) — rooms AND cars.
 *
 * No card, no border around the whole thing — the structure IS the rules.
 * Resources down a 180px gutter, a window of time across the top, one
 * absolutely-positioned block per booking.
 *
 * It draws ANY window, because the two resources do not want the same one:
 *
 *   Rooms   one day, ten hour columns, 08:00-18:00. A meeting is an hour, and
 *           the question is which hour.
 *   Cars    a fortnight or a month, one column per day. A car booking is a
 *           TRIP — the van goes to the provinces Monday and is back Thursday —
 *           and the question is which DAYS it is out.
 *
 * That is one component and not two because everything below the window is
 * identical: lane packing, the hatch that keeps a pending booking from reading
 * as free space, the now-line, the legend, and the empty cells that are the way
 * into the booking form. Copying it for cars is the drift STITCH-PROMPTS §07
 * warns about.
 *
 * Props:
 *   resources   the rows — rooms or cars, each { id, name, ... }
 *   bookings    every booking in the window, any resource
 *   bookingKey  the scalar joining a booking to its row: "roomId" | "carId"
 *   subtitle    (resource) => the second line under the name
 *   bookHref    (resource, column) => where an EMPTY cell books it
 *   bookingHref (booking) => where a TAKEN block opens its detail page
 *   columns     from hourColumns() or dayColumns() in ./columns — the window
 *   snap        round blocks out to whole columns (see BookingBlock)
 *   now         the current moment, or null when not looking at today
 */

/** Where `date` falls in the window, as a fraction, clamped to it. */
const asOffset = (date, from, to) =>
  Math.min(Math.max((date.getTime() - from) / (to - from), 0), 1);

function BookingBlock({ booking, lane, lanes, from, to, columns, snap, href }) {
  let start = new Date(booking.startTime);
  let end = new Date(booking.endTime);

  /**
   * `snap` widens a block out to the columns it touches.
   *
   * Off for rooms: a 09:00-10:00 meeting must draw as one hour of the ten, or
   * the grid stops answering the only question it is asked.
   *
   * On for cars, where a column is a whole day. A half-day errand — 09:00 to
   * 16:00 — is 29% of one day, which on a 30-column grid is nine pixels: a
   * smudge nobody can see, on a screen whose entire job is showing which days a
   * vehicle is out. Snapped, it reads as "out on the 8th", which is both
   * legible and true. The exact hours stay in the block's tooltip, so nothing
   * is lost, only rounded — and rounding OUT is the safe direction: it can make
   * a free afternoon look busy, never a busy day look free.
   */
  if (snap) {
    const first = columns.find((column) => column.end > start);
    const last = [...columns].reverse().find((column) => column.start < end);
    if (!first || !last) return null;
    start = first.start;
    end = last.end;
  }

  const left = asOffset(start, from, to);
  const width = asOffset(end, from, to) - left;

  // A booking entirely outside the window has nowhere to go. Drop it rather
  // than draw a zero-width sliver pinned to the edge, which reads as a block
  // starting at the window's first column and is worse than showing nothing.
  if (width <= 0) return null;

  const isApproved = booking.status === "APPROVED";
  // Test the user, not the formatted string: fullName(null) is "—", which is
  // truthy, so `fullName(...) || "Booked"` never reached its fallback. Room
  // bookings always arrive with their user; the car availability endpoint does
  // not include one, and every block on that grid rendered as a lone em dash.
  const label = booking.user ? fullName(booking.user) : "Booked";
  const real = { start: new Date(booking.startTime), end: new Date(booking.endTime) };
  const sameDay = real.start.toDateString() === real.end.toDateString();

  // The REAL hours, never the snapped ones — this is where the precision that
  // snapping rounds away is kept. Used as both the tooltip and the accessible
  // name: `title` alone names nothing for a screen reader, and this block is a
  // focus stop now that it is a link.
  const description = `${label}, ${
    sameDay
      ? `${clockOf(real.start)} to ${clockOf(real.end)}`
      : `${real.start.toLocaleDateString()} ${clockOf(real.start)} to ${real.end.toLocaleDateString()} ${clockOf(real.end)}`
  }${isApproved ? "" : " (requested)"}`;

  return (
    <Link
      to={href}
      title={description}
      aria-label={`Open booking: ${description}`}
      className={cn(
        "absolute flex items-center overflow-hidden rounded-[4px] px-2",
        // Sits above the empty booking cells, which are links of their own —
        // without this the cell underneath wins the click on the block's own
        // padding and sends the user to an already-taken slot's form.
        "z-[1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
    >
      <span
        className={cn(
          "truncate text-xs",
          !isApproved && "rounded-[2px] bg-background/85 px-1",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * The orange "you are here" rule.
 *
 * bg-signal, not the #C2410C literal it used to be. The literal predated dark
 * mode ever rendering, and a hex cannot follow a theme — the dark block lifts
 * --signal to oklch(0.69 0.17 42) precisely so the now-line still reads as an
 * interruption against a near-black ground.
 */
function NowLine({ now, from, to, showClock }) {
  const offset = asOffset(now, from, to);
  if (offset <= 0 || offset >= 1) return null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-signal"
      style={{ left: `calc(180px + (100% - 180px) * ${offset})` }}
      aria-hidden="true"
    >
      {/* On a month of days the clock is noise — the rule already says "today",
          and a time label collides with the day numbers either side of it. */}
      {showClock && (
        <span className="absolute -top-6 -translate-x-1/2 rounded-[2px] bg-signal px-1 text-[11px] tabular-nums text-signal-foreground">
          {clockOf(now)}
        </span>
      )}
    </div>
  );
}

export function ScheduleGrid({
  resources,
  bookings,
  bookingKey,
  subtitle,
  bookHref,
  bookingHref,
  columns,
  snap = false,
  now,
}) {
  const from = columns[0].start.getTime();
  const to = columns[columns.length - 1].end.getTime();

  const byResource = new Map(resources.map((resource) => [resource.id, []]));
  for (const booking of bookings) {
    byResource.get(booking[bookingKey])?.push(booking);
  }

  // Hour columns need room for "08:00"; day columns need room for "31". Below
  // this the grid scrolls sideways rather than crushing the labels.
  const minColumnWidth = snap ? 34 : 68;

  return (
    <div className="relative overflow-x-auto">
      <div style={{ minWidth: 180 + columns.length * minColumnWidth }}>
        {/* Column labels. The 180px gutter keeps them over their own columns. */}
        <div className="flex pb-2 pl-[180px]">
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                "flex-1 text-xs tabular-nums",
                column.muted ? "text-muted-foreground/50" : "text-muted-foreground",
              )}
            >
              {column.sublabel && (
                <div className="text-[10px] uppercase">{column.sublabel}</div>
              )}
              {column.label}
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
                {/* Empty cells: they draw the vertical rules AND are the way
                    into the booking form. The grid IS the resource picker —
                    there is no route that books "a room" without one. */}
                <div className="absolute inset-0 flex">
                  {columns.map((column) => (
                    <Link
                      key={column.key}
                      to={bookHref(resource, column)}
                      aria-label={`Book ${resource.name} on ${column.start.toLocaleDateString()}${
                        column.sublabel ? "" : ` at ${column.label}`
                      }`}
                      className={cn(
                        "group flex flex-1 items-center justify-center border-l text-muted-foreground",
                        column.muted && "bg-muted/30",
                      )}
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
                      from={from}
                      to={to}
                      columns={columns}
                      snap={snap}
                      href={bookingHref(booking)}
                    />
                  ),
                )}
              </div>
            </div>
          ))}

          {now && (
            <NowLine now={now} from={from} to={to} showClock={!snap} />
          )}
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

export default ScheduleGrid;
