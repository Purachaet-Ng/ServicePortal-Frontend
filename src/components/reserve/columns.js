/**
 * The two window shapes ScheduleGrid can draw, as pure functions.
 *
 * Here rather than in ScheduleGrid.jsx so that file exports components only —
 * mixing the two breaks Vite's fast refresh, which is what `lanes.js` is
 * already next door for.
 */

const START_HOUR = 8;
const END_HOUR = 18;

const pad = (n) => String(n).padStart(2, "0");
export const clockOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * One day, 08:00 to 18:00, an hour a column — the room window.
 *
 * The band is the operational day, not the whole clock: nobody books a meeting
 * room at 03:00, and drawing 24 columns to prove it wastes two thirds of the
 * width.
 */
export function hourColumns(day) {
  return Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
    const hour = START_HOUR + i;
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    return { key: hour, label: `${pad(hour)}:00`, start, end };
  });
}

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * `count` whole days from `from`, a day a column — the car window.
 *
 * Whole days, not the 08:00-18:00 band: a trip that leaves at 07:00 or gets
 * back at 21:00 is still that day, and clipping it to office hours would draw
 * the car free on a day it is hundreds of kilometres away.
 *
 * `muted` marks weekends. On a 30-column grid the eye needs somewhere to rest
 * to count days at all; it is the only thing separating "the 14th" from "the
 * 21st" at a glance.
 */
export function dayColumns(from, count) {
  const first = startOfDay(from);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(first);
    start.setDate(first.getDate() + i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return {
      key: start.getTime(),
      label: String(start.getDate()),
      sublabel: WEEKDAY[start.getDay()],
      muted: start.getDay() === 0 || start.getDay() === 6,
      start,
      end,
    };
  });
}

