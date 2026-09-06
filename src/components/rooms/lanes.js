/**
 * Pack overlapping bookings into horizontal lanes within one room row.
 *
 * Nothing stops two bookings claiming the same room and hour: addRoomBooking()
 * has no overlap guard, and the DB has no exclusion constraint. Drawn naively
 * they land on top of each other and the row shows ONE booking where there are
 * three — the same "looks free, is not" failure the hatched pending block
 * exists to prevent, just wearing a different hat.
 *
 * Greedy by start time: each booking takes the first lane whose last booking
 * has already ended. Optimal for interval-graph colouring, and short.
 *
 * Returns [{ booking, lane, lanes }], where `lanes` is the row's total so a
 * caller can size each block to 1/lanes of the row height.
 */
export function assignLanes(bookings) {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );

  const laneEnds = []; // laneEnds[i] = when lane i became free, as a timestamp
  const placed = sorted.map((booking) => {
    const start = new Date(booking.startTime).getTime();
    const end = new Date(booking.endTime).getTime();

    // Touching is not overlapping: a 10:00-11:00 and an 11:00-12:00 share a
    // lane. Using >= here instead would waste a lane on every back-to-back pair.
    let lane = laneEnds.findIndex((freeAt) => freeAt <= start);
    if (lane === -1) lane = laneEnds.length;

    laneEnds[lane] = end;
    return { booking, lane };
  });

  const lanes = Math.max(laneEnds.length, 1);
  return placed.map((entry) => ({ ...entry, lanes }));
}

export default assignLanes;
