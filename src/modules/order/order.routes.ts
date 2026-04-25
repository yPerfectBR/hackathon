import { FastifyPluginAsync } from "fastify";
import { InventoryService } from "../inventory/inventory.service";
import { OrderController } from "./order.controller";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";

export const orderRoutes: FastifyPluginAsync = async (app) => {
  const repository = new OrderRepository();
  const inventoryService = new InventoryService();
  const service = new OrderService(repository, inventoryService);
  const controller = new OrderController(service);

  app.post("/", controller.create);
  app.get("/:id", controller.getById);
  app.get("/customer/:customerId", controller.getByCustomer);
  app.patch("/:id/status", controller.updateStatus);
  app.patch("/:id/logistic-status", controller.updateLogisticStatus);
  app.post("/:id/add-item", controller.addItem);
  app.post("/:id/remove-item", controller.removeItem);
};
