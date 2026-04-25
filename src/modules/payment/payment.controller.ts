import { FastifyReply, FastifyRequest } from "fastify";
import { orderIdParamsSchema } from "./payment.schemas";
import { PaymentService } from "./payment.service";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  pay = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payment = await this.service.payOrder(params.orderId);
    return reply.send(payment);
  };

  getByOrder = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payment = await this.service.getByOrder(params.orderId);
    if (!payment) {
      return reply.notFound("Pagamento não encontrado");
    }
    return reply.send(payment);
  };
}
