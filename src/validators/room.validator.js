import { z } from "zod";

export const roomSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(120),
  location: z.string().trim().max(200).optional(),
  capacity: z.coerce.number().int().positive("Capacity must be at least 1"),
});

/**
 * The end-after-start check lives here so the user sees it immediately, but the
 * backend must repeat it — and it is the only thing that can catch a DOUBLE
 * booking, which no client-side rule can see. Handle the 409 (WORKFLOW.md §A7).
 */
export const bookingSchema = z
  .object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((value) => new Date(value.endTime) > new Date(value.startTime), {
    message: "End time must be after the start time",
    path: ["endTime"],
  });
