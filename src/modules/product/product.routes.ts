import { FastifyPluginAsync } from "fastify";
import { ProductController } from "./product.controller";
import { ProductRepository } from "./product.repository";
import { ProductService } from "./product.service";

export const productRoutes: FastifyPluginAsync = async (app) => {
  const repository = new ProductRepository();
  const service = new ProductService(repository);
  const controller = new ProductController(service);

  app.get("/", controller.list);
  app.get("/search", controller.search);
  app.get("/:id", controller.getById);
  app.post("/", controller.create);
  app.put("/:id", controller.update);
  app.delete("/:id", controller.delete);
};
