import { z } from "zod";
import { objectIdSchema, phoneSchema } from "../../shared/schemas";

export const customerIdParamsSchema = z.object({
  id: objectIdSchema
});

export const phoneParamsSchema = z.object({
  phone: phoneSchema
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  phone: phoneSchema,
  whatsapp: phoneSchema.optional(),
  cpfCnpj: z.string().trim().min(11).max(18),
  address: z.object({
    street: z.string().trim().min(1),
    number: z.string().trim().min(1),
    district: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(2).max(2),
    zipCode: z.string().trim().min(8).max(10),
    complement: z.string().trim().optional()
  })
});

export const upsertCustomerByPhoneSchema = z.object({
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
