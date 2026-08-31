import { z } from "zod";

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(200),
  sku: z.string().trim().max(64).optional(),
  description: z.string().max(2000).optional(),
  qtyTotal: z.coerce.number().int().nonnegative(),
  qtyAvailable: z.coerce.number().int().nonnegative(),
});

/**
 * Quantity is checked against live stock by the backend, which is the only
 * place that can do it safely. A catalog page showing 5 in stock can be stale
 * by the time the form submits, so always handle 409 INSUFFICIENT_STOCK.
 */
export const inventoryRequestSchema = z.object({
  quantity: z.coerce.number().int().positive("Request at least 1"),
  reason: z.string().trim().max(1000).optional(),
});
