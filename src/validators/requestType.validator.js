import { z } from "zod";
// Relative, not "@/lib/constants": node --test resolves no vite aliases, and
// this file has a test beside it. constants.js imports nothing itself.
import { FORM_FIELD_TYPES } from "../lib/constants.js";

/**
 * The CREATE REQUEST TYPE form. Its shape is deliberately NOT the request body:
 * a textarea hands back one string, a Select hands back a string, and the API
 * wants an array of typed objects. `toFormSchema` below is the one place that
 * translation happens, so the page never assembles form_schema by hand.
 *
 * The backend re-validates everything (backend/src/validators/requestType.validator.js);
 * this exists so the admin sees the problem before the round trip.
 */

/** The two types that carry an options list. */
const OPTION_TYPES = new Set(["select", "multiselect"]);

/** One option per line. Blank lines are typing, not options. */
export const splitOptions = (text) =>
  (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * A label typed as "Number of openings" becomes the key "number_of_openings".
 * Keys must start with a letter — see the regex below for why.
 */
export const slugifyKey = (label) => {
  const slug = (label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(slug) ? slug : slug && `f_${slug}`;
};

const fieldRowSchema = z
  .object({
    // DynamicForm builds the react-hook-form path as `custom_fields.${key}`, so
    // a key with a dot in it would silently nest and the value would never
    // arrive. Letters, digits and underscores only, starting with a letter.
    key: z
      .string()
      .trim()
      .min(1, "Key is required")
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "Start with a letter, then letters, numbers or underscores",
      ),
    label: z.string().trim().min(1, "Label is required"),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.boolean(),
    options: z.string().optional(),
  })
  .refine(
    (row) => !OPTION_TYPES.has(row.type) || splitOptions(row.options).length > 0,
    { message: "Add at least one option", path: ["options"] },
  );

export const createRequestTypeFormSchema = z
  .object({
    departmentId: z.coerce.number().int().positive("Choose a department"),
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000).optional(),
    // "" is "nobody in particular"; the select's own empty value.
    defaultAssigneeId: z.string().optional(),
    // The backend rejects an empty array too — a request type with no fields
    // renders a form with nothing on it.
    formSchema: z.array(fieldRowSchema).min(1, "Add at least one field"),
  })
  .superRefine((values, ctx) => {
    // Two fields sharing a key overwrite each other inside custom_fields, and
    // nothing downstream complains — the second value just wins.
    const seen = new Set();
    values.formSchema.forEach((row, index) => {
      const key = row.key?.trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "Another field already uses this key",
          path: ["formSchema", index, "key"],
        });
        return;
      }
      seen.add(key);
    });
  });

/** A fresh row for the field builder. */
export const blankField = () => ({
  key: "",
  label: "",
  type: "text",
  required: false,
  options: "",
});

/**
 * Form rows to form_schema. `order` comes from the row's position, which is why
 * the builder has move up/down buttons and no order input.
 *
 * Tolerates half-typed rows so the live preview can call it on every keystroke.
 */
export const toFormSchema = (rows) =>
  (rows ?? []).map((row, index) => ({
    key: (row.key ?? "").trim(),
    label: (row.label ?? "").trim(),
    type: row.type,
    required: Boolean(row.required),
    order: index + 1,
    ...(OPTION_TYPES.has(row.type)
      ? { options: splitOptions(row.options) }
      : {}),
  }));

export const hasOptions = (type) => OPTION_TYPES.has(type);
