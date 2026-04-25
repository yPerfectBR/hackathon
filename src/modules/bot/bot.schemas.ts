import { z } from "zod";
import { objectIdSchema, phoneSchema } from "../../shared/schemas";

export const botProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional()
});

export const botProductIdParamsSchema = z.object({
  id: objectIdSchema
});

export const botCustomerSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1),
  cpfCnpj: z.string().trim().min(11).max(18).optional(),
  address: z.object({
    street: z.string().trim().min(1),
    number: z.string().trim().min(1),
    district: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(2).max(2),
    zipCode: z.string().trim().min(8).max(10),
    complement: z.string().trim().optional()
  }).optional()
});

export const botCreateOrderSchema = z.object({
  phone: phoneSchema,
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int().positive()
    })
  ).min(1)
});

export const botOrderIdParamsSchema = z.object({
  id: objectIdSchema
});

export const botOrderItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().positive()
});

export const botQuoteSchema = z.object({
  phone: phoneSchema,
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int().positive(),
      discount: z.number().min(0).optional()
    })
  ).min(1)
});
