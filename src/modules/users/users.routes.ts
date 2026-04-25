import { FastifyPluginAsync } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { UserModel } from "./user.model";

const createUserSchema = z.object({
  name: z.string().min(1),
  money: z.number().min(0).default(0)
});

const updateMoneySchema = z.object({
  money: z.number().min(0)
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    const payload = createUserSchema.parse(request.body);
    const user = await UserModel.create(payload);
    return reply.code(201).send(user);
  });

  app.get("/", async () => UserModel.find().sort({ createdAt: -1 }));

  app.get("/:id/inventory", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    if (!Types.ObjectId.isValid(params.id)) {
      return reply.badRequest("ID de usuário inválido");
    }

    const user = await UserModel.findById(params.id);
    if (!user) {
      return reply.notFound("Usuário não encontrado");
    }

    return user.inventory;
  });

  app.patch("/:id/money", async (request, reply) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    if (!Types.ObjectId.isValid(params.id)) {
      return reply.badRequest("ID de usuário inválido");
    }

    const payload = updateMoneySchema.parse(request.body);
    const user = await UserModel.findByIdAndUpdate(params.id, { money: payload.money }, {
      returnDocument: "after"
    });

    if (!user) {
      return reply.notFound("Usuário não encontrado");
    }

    return user;
  });
};
