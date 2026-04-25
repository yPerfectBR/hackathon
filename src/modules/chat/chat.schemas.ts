import { z } from "zod";
import { phoneSchema } from "../../shared/schemas";

export const chatMessageSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1)
});

export const chatPhoneParamsSchema = z.object({
  phone: phoneSchema
});

export const chatProductQuerySchema = z.object({
  query: z.string().trim().min(1).optional()
});
