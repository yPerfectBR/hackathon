import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { objectIdSchema } from "../../shared/schemas";
import { FinanceModel } from "./finance.model";

const orderParams = z.object({ orderId: objectIdSchema });

export const financeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/:orderId", async (request, reply) => {
    const params = orderParams.parse(request.params);
    const finance = await FinanceModel.findOne({ orderId: params.orderId });
    if (!finance) {
      return reply.notFound("Financeiro não encontrado");
    }
    return reply.send(finance);
  });
};
