import { z } from "zod";

export const roomSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(120),
  location: z.string().trim().max(200).optional(),
  capacity: z.coerce.number().int().positive("Capacity must be at least 1"),
});

/**
 * One day and a pair of hours — the shape BookRoomPage's three native inputs
 * produce, NOT the shape the API takes. The page composes `date` and each time
 * into an ISO timestamp on submit.
 *
 * The end-after-start check lives here so the user sees it immediately, but the
 * backend must repeat it — and it is the only thing that can catch a DOUBLE
 * booking, which no client-side rule can see. Handle the 409 (WORKFLOW.md §A7).
 *
 * Times compare as "HH:MM" strings rather than as dates. Within a single day
 * that ordering is identical to the chronological one, zero-padding guarantees
 * it, and it avoids `new Date("14:00")` — which is an Invalid Date, so the
 * refine it used to sit in silently passed everything.
 */
export const bookingSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    // Optional, mirroring the backend. An approver reads it; nothing queries
    // it. The 500 cap matches optionalNote() in common.validator.js — a longer
    // one would pass here and come back a 400.
    purpose: z.string().trim().max(500, "Keep it under 500 characters").optional(),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "End time must be after the start time",
    path: ["endTime"],
  });
