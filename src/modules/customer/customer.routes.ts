import { FastifyPluginAsync } from "fastify";
import { CustomerController } from "./customer.controller";
import { CustomerRepository } from "./customer.repository";
import { CustomerService } from "./customer.service";

export const customerRoutes: FastifyPluginAsync = async (app) => {
  const repository = new CustomerRepository();
  const service = new CustomerService(repository);
  const controller = new CustomerController(service);

  app.get("/phone/:phone", controller.getByPhone);
  app.get("/:id/orders", controller.getOrders);
  app.get("/:id", controller.getById);
  app.post("/", controller.create);
  app.post("/upsert", controller.upsertByPhone);
};
