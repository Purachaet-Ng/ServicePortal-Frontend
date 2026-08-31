import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().max(5000).optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((value) => new Date(value.endTime) > new Date(value.startTime), {
    message: "End time must be after the start time",
    path: ["endTime"],
  });

/** RSVP is an upsert, so the control toggles rather than erroring on a second click. */
export const rsvpSchema = z.object({
  rsvpStatus: z.enum(["going", "not_going", "maybe"]),
});
