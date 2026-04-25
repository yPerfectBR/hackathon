import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";

export const createQuoteSchema = z.object({
  customerId: objectIdSchema,
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int().positive(),
      discount: z.number().min(0).optional()
    })
  ).min(1)
});

export const quoteIdParamsSchema = z.object({
  id: objectIdSchema
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum(["draft", "sent", "approved", "rejected"])
});
