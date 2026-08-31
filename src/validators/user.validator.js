import { z } from "zod";
import { ROLE_OPTIONS } from "@/lib/constants";

/**
 * Mirrors backend/src/validators/user.validator.js so the admin sees the error
 * before the round trip. The backend re-validates — this is convenience, not
 * the boundary.
 */

const phoneRegex = /^(?:\+66|0)[689]\d[- ]?\d{3}[- ]?\d{4}$/;

const name = (field) => z.string().trim().min(1, `${field} is required`);

/**
 * Optional everywhere. An empty string is what an untouched input holds, and it
 * is NOT a phone number — the page strips it to undefined before sending so the
 * backend`s regex never sees "".
 */
const phone = z
  .string()
  .trim()
  .regex(phoneRegex, "Invalid phone number format")
  .optional()
  .or(z.literal(""));

/**
 * Radix Select holds every value as a string, so an id arrives as "3". coerce
 * turns it back into the number the API expects. "" means "no department",
 * which is a legal state — departmentId is nullable on the User model.
 */
const departmentId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .optional();

const role = z.enum(ROLE_OPTIONS.map((option) => option.value));

/** POST /users — an admin creating an account on someone else`s behalf. */
export const createUserSchema = z.object({
  firstname: name("First name"),
  lastname: name("Last name"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .pipe(z.email({ error: "Invalid email format" })),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone,
  departmentId,
  role,
});

/**
 * PATCH /users/:id — the fields an admin may edit. Email and password are
 * deliberately absent: the backend`s updateUserSchema does not accept them, so
 * offering them here would build a form whose values are silently discarded.
 */
export const updateUserSchema = z.object({
  firstname: name("First name"),
  lastname: name("Last name"),
  phone,
  departmentId,
});

/** PATCH /users/:id/role — role and nothing else. */
export const updateUserRoleSchema = z.object({ role });
