import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required").max(120),
});

/**
 * form_schema is authored as raw JSON in a textarea with a live preview — a
 * real drag-and-drop builder is far too much work for a class project
 * (PLAN.md §9). This parses the text and checks the shape DynamicForm needs.
 */
export const formSchemaFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().optional(),
  order: z.number().optional(),
  options: z.array(z.string()).optional(),
  validation: z.record(z.string(), z.any()).optional(),
});

export const requestTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  formSchema: z.array(formSchemaFieldSchema),
  defaultAssigneeId: z.coerce.number().int().positive().nullable().optional(),
});
