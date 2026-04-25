import { FastifyPluginAsync } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { ProductModel } from "./product.model";

const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  stock: z.number().int().min(0).default(0)
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional()
});

export const productsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    const payload = createProductSchema.parse(request.body);
    const product = await ProductModel.create(payload);
    return reply.code(201).send(product);
  });

  app.get("/", async () => ProductModel.find().sort({ createdAt: -1 }));

  app.patch("/:id", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    if (!Types.ObjectId.isValid(params.id)) {
      return reply.badRequest("ID de produto inválido");
    }

    const payload = updateProductSchema.parse(request.body);
    const product = await ProductModel.findByIdAndUpdate(params.id, payload, {
      returnDocument: "after"
    });

    if (!product) {
      return reply.notFound("Produto não encontrado");
    }

    return product;
  });

  app.delete("/:id", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    if (!Types.ObjectId.isValid(params.id)) {
      return reply.badRequest("ID de produto inválido");
    }

    const product = await ProductModel.findByIdAndDelete(params.id);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }

    return reply.code(204).send();
  });
};
