import { z } from "zod";

const requiredText = (label) => z.string().trim().min(1, `${label} is required`);

export const inventoryItemSchema = z.object({
  sku: requiredText("SKU").max(64),
  name: requiredText("Item name").max(200),
  unit: requiredText("Unit").max(50),
  isSerialized: z.boolean(),
});

export const inventoryStockSchema = z.object({
  departmentId: z.coerce.number().int().positive("Select a department"),
  itemId: z.coerce.number().int().positive("Select an item"),
  minStock: z.coerce.number().int().nonnegative("Low-stock threshold cannot be negative"),
});

export const inventoryAdjustmentSchema = z
  .object({
    quantity: z.coerce.number().int().positive("Enter a whole number greater than 0"),
    mode: z.enum(["RECEIVE", "REMOVE"]),
    note: z.string().trim().max(500).optional(),
  })
  .superRefine((data, context) => {
    if (data.mode === "REMOVE" && !data.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A reason is required when reducing stock",
      });
    }
  });

export const inventoryAssetSchema = z.object({
  stockId: z.coerce.number().int().positive("Select an inventory stock"),
  serialNo: requiredText(" Serial Number").max(120),
  assetTag: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
});

export const inventoryRequestSchema = z.object({
  fromDepartmentId: z.coerce.number().int().positive("Select a department"),
  reason: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        stockId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Select at least one item"),
});

export const inventoryReturnSchema = z.object({
  conditionIn: requiredText("Return condition").max(500),
  outcome: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]),
});

export const inventoryIssueSchema = z.object({
  assetId: z.coerce.number().int().positive("Select an asset"),
  userId: z.coerce.number().int().positive("Select a recipient"),
  conditionOut: z.string().trim().max(500).optional(),
  note: requiredText("Issue reason").max(500),
});
