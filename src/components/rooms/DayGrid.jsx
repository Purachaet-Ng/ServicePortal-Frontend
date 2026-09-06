import { Link } from "react-router";

import { cn } from "@/lib/utils";
import { fullName } from "@/lib/format";
import { assignLanes } from "./lanes";

/**
 * The room availability day grid (STITCH-PROMPTS.md §10).
 *
 * No card, no border around the whole thing — the structure IS the rules. Rooms
 * down a 180px gutter, hours across the top, one absolutely-positioned block
 * per booking.
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

/** Hours since START_HOUR as a fraction of the visible day, clamped to it. */
const asOffset = (date) => {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.min(Math.max((hours - START_HOUR) / SPAN, 0), 1);
};

const pad = (n) => String(n).padStart(2, "0");
const clockOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function BookingBlock({ booking, lane, lanes }) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  const left = asOffset(start);
  const width = asOffset(end) - left;

  // A booking entirely outside 08:00-18:00 has nowhere to go. Drop it rather
  // than draw a zero-width sliver pinned to the edge, which reads as a block
  // starting at 08:00 and is worse than showing nothing.
  if (width <= 0) return null;

  const isApproved = booking.status === "APPROVED";
  const label = fullName(booking.user) || "Booked";

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

/** The orange "you are here" rule. Only meaningful on today's grid. */
function NowLine({ now }) {
  const offset = asOffset(now);
  if (offset <= 0 || offset >= 1) return null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-[#C2410C]"
      style={{ left: `calc(180px + (100% - 180px) * ${offset})` }}
      aria-hidden="true"
    >
      <span className="absolute -top-6 -translate-x-1/2 rounded-[2px] bg-[#C2410C] px-1 text-[11px] tabular-nums text-white">
        {clockOf(now)}
      </span>
    </div>
  );
}

export function DayGrid({ rooms, bookings, now }) {
  const byRoom = new Map(rooms.map((room) => [room.id, []]));
  for (const booking of bookings) {
    byRoom.get(booking.roomId)?.push(booking);
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
          {rooms.map((room) => (
            <div key={room.id} className="flex border-b">
              <div className="w-[180px] shrink-0 py-3 pr-4">
                <p className="truncate text-sm">{room.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[room.location, `seats ${room.capacity}`]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <div className="relative min-h-[52px] flex-1">
                {/* Empty hour cells: they draw the vertical rules AND are the
                    way into the booking form. The grid IS the room picker —
                    there is no route that books "a room" without one. */}
                <div className="absolute inset-0 flex">
                  {HOURS.map((hour) => (
                    <Link
                      key={hour}
                      to={`/rooms/${room.id}/book`}
                      aria-label={`Book ${room.name} at ${pad(hour)}:00`}
                      className="group flex flex-1 items-center justify-center border-l text-muted-foreground"
                    >
                      <span className="text-sm opacity-0 transition-opacity group-hover:opacity-40">
                        +
                      </span>
                    </Link>
                  ))}
                </div>

                {assignLanes(byRoom.get(room.id) ?? []).map(
                  ({ booking, lane, lanes }) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      lane={lane}
                      lanes={lanes}
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

