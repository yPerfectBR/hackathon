import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";

export const orderIdParamsSchema = z.object({
  orderId: objectIdSchema
});
