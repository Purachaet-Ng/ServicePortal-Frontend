import { z } from "zod";

/**
 * Mirrors backend/src/validators/auth.validator.js so the user sees the error
 * before the round trip. The backend re-validates — this is convenience, not
 * the boundary.
 */

const phoneRegex = /^(?:\+66|0)[689]\d[- ]?\d{3}[- ]?\d{4}$/;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .pipe(z.email({ error: "Invalid email format" }));

const password = z
  .string()
  .min(6, "Password must be at least 6 characters");

const name = (field) =>
  z.string().trim().min(1, `${field} is required`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstname: name("First name"),
  lastname: name("Last name"),
  email,
  password,
  // Optional, but if given it must be a Thai mobile number — the backend
  // strips the separators, so send what the user typed.
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  // The register endpoint takes departmentId, never a role: roles are assigned
  // by an administrator after the account exists (STITCH-PROMPTS §02).
  departmentId: z.coerce
    .number()
    .int()
    .positive("Select your department")
    .optional(),
});
