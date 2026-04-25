import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";
import { FiscalModel } from "./fiscal.model";

const orderParams = z.object({ orderId: objectIdSchema });

export const fiscalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:orderId", async (request, reply) => {
    const params = orderParams.parse(request.params);
    const fiscal = await FiscalModel.findOne({ orderId: params.orderId });
    if (!fiscal) {
      return reply.notFound("Fiscal não encontrado");
    }
    return reply.send(fiscal);
  });
};
