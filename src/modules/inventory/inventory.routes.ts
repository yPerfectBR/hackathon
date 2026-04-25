import { FastifyPluginAsync } from "fastify";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  const service = new InventoryService();
  const controller = new InventoryController(service);

  app.get("/", controller.list);
  app.patch("/:productId", controller.update);
};
