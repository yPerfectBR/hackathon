import { FastifyPluginAsync } from "fastify";
import { InventoryService } from "../inventory/inventory.service";
import { PaymentController } from "./payment.controller";
import { PaymentRepository } from "./payment.repository";
import { PaymentService } from "./payment.service";

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  const repository = new PaymentRepository();
  const inventoryService = new InventoryService();
  const service = new PaymentService(repository, inventoryService);
  const controller = new PaymentController(service);

  app.post("/:orderId/pay", controller.pay);
  app.get("/:orderId", controller.getByOrder);
};
