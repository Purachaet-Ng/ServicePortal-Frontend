import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().max(5000).optional(),
    location: z.string().trim().max(255).optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((value) => new Date(value.endTime) > new Date(value.startTime), {
    message: "End time must be after the start time",
    path: ["endTime"],
  });

export const createEventSchema = eventSchema.and(
  z.object({
    departmentId: z.string().min(1, "Department is required"),
    userIds: z
      .array(z.number())
      .min(1, "Select at least one staff member"),
  }),
);

/** Employee invitation response. */
export const rsvpSchema = z.object({
  rsvpStatus: z.enum(["ACCEPTED", "DECLINED"]),
});
