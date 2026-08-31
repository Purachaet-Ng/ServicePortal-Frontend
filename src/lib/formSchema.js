import { z } from "zod";

/**
 * Turn a request type`s form_schema (data, from the database) into a zod schema
 * (code, at runtime). WORKFLOW.md §A3.
 *
 * This is the frontend half of the form_schema idea: the backend validates the
 * same shape in utils/schemaValidator.js. Ours exists so the user sees the
 * error before the round trip — it is NOT the boundary. The server re-checks
 * everything and can still return 422.
 *
 * Rebuild it whenever the request type changes:
 *   const schema = useMemo(() => zodFromFormSchema(type?.formSchema ?? []), [type]);
 */
export function zodFromFormSchema(schema) {
  const shape = {};

  for (const field of schema ?? []) {
    let rule;

    switch (field.type) {
      case "number":
        rule = z.coerce.number();
        if (field.validation?.min != null) rule = rule.min(field.validation.min);
        if (field.validation?.max != null) rule = rule.max(field.validation.max);
        break;

      case "select":
        // An admin can save an empty options array. z.enum([]) throws, so fall
        // back to a plain string rather than taking the page down.
        rule = field.options?.length ? z.enum(field.options) : z.string();
        break;

      case "multiselect":
        rule = z.array(z.string());
        if (field.required) rule = rule.min(1, "Select at least one option");
        break;

      case "checkbox":
        rule = z.boolean();
        break;

      case "user_picker":
        rule = z.coerce.number().int().positive();
        break;

      case "date":
        rule = z.string().min(1);
        break;

      default:
        rule = z.string();
        if (field.validation?.minLength)
          rule = rule.min(field.validation.minLength);
        if (field.validation?.maxLength)
          rule = rule.max(field.validation.maxLength);
    }

    if (field.required) {
      // An empty text input arrives as "" — .min(1) is what actually catches it.
      if (rule instanceof z.ZodString) rule = rule.min(1, "This field is required");
    } else {
      rule = rule.optional();
    }

    shape[field.key] = rule;
  }

  return z.object(shape);
}

/**
 * Sensible starting values so react-hook-form owns every input from the first
 * render. A controlled input that starts as undefined and later gets a value
 * makes React log the uncontrolled-to-controlled warning.
 */
export function defaultsFromFormSchema(schema) {
  const values = {};
  for (const field of schema ?? []) {
    switch (field.type) {
      case "checkbox":
        values[field.key] = false;
        break;
      case "multiselect":
        values[field.key] = [];
        break;
      case "number":
      case "user_picker":
        values[field.key] = "";
        break;
      default:
        values[field.key] = "";
    }
  }
  return values;
}
