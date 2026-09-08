import { z } from "zod";

/**
 * Mirrors backend/src/validators/car.validator.js, in the shape room.validator
 * already uses here: one schema for both create and edit. The backend's
 * updateCarSchema is carSchema.partial(), but CarFormDialog always submits
 * every field, so a partial client schema would only weaken the check without
 * changing what is sent.
 *
 * `plate` is @unique in the database. Nothing here can see that — the form
 * handles the collision when it comes back from the server.
 */
export const carSchema = z.object({
  name: z.string().trim().min(1, "Vehicle name is required").max(120),
  plate: z.string().trim().min(1, "Plate is required").max(20),
  seats: z.coerce.number().int().positive("Seats must be at least 1"),
  location: z.string().trim().max(200).optional(),
});

/**
 * A trip: a range of days plus the hours it leaves and returns.
 *
 * This is where cars diverge from rooms. A room booking is one `date` and two
 * times; a trip has a departure day and a return day.
 *
 * ONE `range` field, not a `from` and a `to`, because react-day-picker owns
 * both halves and emits them together — splitting them across two form fields
 * means writing one of them with setValue from inside the other's Controller,
 * and the two can then disagree about a half-finished selection.
 *
 * `to` is optional for the same reason: mid-drag the picker reports a `from`
 * with no `to` yet. A range that never gets one is a single-day trip, which is
 * the friendly reading of one click and saves a second click for the common
 * short errand. The page resolves it as `to ?? from`.
 *
 * The end-after-start refine considers BOTH halves: on a single-day trip the
 * times decide it, on a multi-day one the dates already have. Checking only the
 * times would wrongly reject a Friday-08:00 return on a Monday-17:00 departure;
 * checking only the dates would wrongly accept 17:00 to 08:00 on one day.
 */
export const carBookingSchema = z
  .object({
    range: z.object(
      {
        from: z.date({ error: "Pick a departure day" }),
        to: z.date().optional(),
      },
      { error: "Pick the days the vehicle is needed" },
    ),
    startTime: z.string().min(1, "Departure time is required"),
    endTime: z.string().min(1, "Return time is required"),
  })
  .refine(
    (value) => {
      const to = value.range.to ?? value.range.from;
      return value.range.from.toDateString() === to.toDateString()
        ? value.endTime > value.startTime
        : to >= value.range.from;
    },
    {
      message: "The return must be after the departure",
      path: ["endTime"],
    },
  );
