import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";
import { orderStatusSchema } from "./order.model";

export const createOrderSchema = z.object({
  customerId: objectIdSchema,
  items: z.array(
    z.object({
      productId: objectIdSchema,
      quantity: z.number().int().positive()
    })
  ).min(1)
});

export const orderIdParamsSchema = z.object({
  id: objectIdSchema
});

export const customerIdParamsSchema = z.object({
  customerId: objectIdSchema
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusSchema)
});

export const updateLogisticStatusSchema = z.object({
  logisticStatus: z.enum(["open", "production", "delivered"])
});

export const addOrderItemSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().positive()
});

export const removeOrderItemSchema = z.object({
  productId: objectIdSchema
});
