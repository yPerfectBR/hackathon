import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";

export const updateInventoryParamsSchema = z.object({
  productId: objectIdSchema
});

export const updateInventorySchema = z.object({
  stock: z.number().int().min(0)
});
