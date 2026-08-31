import { z } from "zod";
import { PRIORITY_ORDER, TICKET_STATUS_ORDER } from "@/lib/constants";

/**
 * The FIXED fields only. The dynamic half of a ticket comes from the request
 * type`s form_schema and is built at runtime by zodFromFormSchema()
 * (lib/formSchema.js) — merge the two with .extend({ custom_fields: dynamic }).
 */
export const createTicketSchema = z.object({
  request_type_id: z.coerce.number().int().positive("Choose a request type"),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(PRIORITY_ORDER),
});

/**
 * PATCH sends one concern at a time — status, priority, or assignee. Which
 * status values are legal from the current one is TICKET_TRANSITIONS, not this
 * schema: it depends on the row, so the buttons are derived from the table and
 * the backend enforces it with 422 INVALID_TRANSITION.
 */
export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUS_ORDER).optional(),
  priority: z.enum(PRIORITY_ORDER).optional(),
  assignedToId: z.coerce.number().int().positive().nullable().optional(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Write something first").max(5000),
});
