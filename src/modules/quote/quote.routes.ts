import { FastifyPluginAsync } from "fastify";
import { QuoteController } from "./quote.controller";
import { QuoteService } from "./quote.service";

export const quoteRoutes: FastifyPluginAsync = async (app) => {
  const controller = new QuoteController(new QuoteService());

  app.post("/", controller.create);
  app.get("/:id", controller.getById);
  app.patch("/:id/status", controller.updateStatus);
  app.post("/:id/approve", controller.approveAndConvert);
};
