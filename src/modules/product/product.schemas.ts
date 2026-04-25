import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional()
});

export const productIdParamsSchema = z.object({
  id: objectIdSchema
});

export const searchProductQuerySchema = z.object({
  name: z.string().trim().min(1)
});

export const createProductSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  basicDescription: z.string().trim().min(1),
  fullDescription: z.string().trim().min(1),
  imageUrl: z.string().trim().url().optional(),
  salePrice: z.number().min(0),
  productionCost: z.number().min(0),
  ncm: z.string().trim().min(2),
  stock: z.number().int().min(0),
  isFeatured: z.boolean().optional()
});

export const updateProductSchema = createProductSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  "Nenhum campo enviado para atualização"
);
