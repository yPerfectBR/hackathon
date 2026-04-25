import { FastifyPluginAsync } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { UserModel } from "../users/user.model";

const jobs = {
  freelancer: { label: "Freelancer", min: 80, max: 180 },
  entregador: { label: "Entregador", min: 40, max: 120 },
  designer: { label: "Designer", min: 90, max: 210 }
} as const;

const workSchema = z.object({
  userId: z.string(),
  job: z.enum(["freelancer", "entregador", "designer"])
});

export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => jobs);

  app.post("/work", async (request, reply) => {
    const payload = workSchema.parse(request.body);
    if (!Types.ObjectId.isValid(payload.userId)) {
      return reply.badRequest("ID de usuário inválido");
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return reply.notFound("Usuário não encontrado");
    }

    const selectedJob = jobs[payload.job];
    const earned = Math.floor(Math.random() * (selectedJob.max - selectedJob.min + 1)) + selectedJob.min;

    user.money = user.money + earned;
    await user.save();

    return reply.code(200).send({
      job: payload.job,
      earned,
      currentMoney: user.money
    });
  });
};
