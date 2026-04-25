import { FastifyReply, FastifyRequest } from "fastify";
import {
  createQuoteSchema,
  quoteIdParamsSchema,
  updateQuoteStatusSchema
} from "./quote.schemas";
import { QuoteService } from "./quote.service";

export class QuoteController {
  constructor(private readonly service: QuoteService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = createQuoteSchema.parse(request.body);
    const quote = await this.service.create(payload);
    return reply.code(201).send(quote);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = quoteIdParamsSchema.parse(request.params);
    const quote = await this.service.findById(params.id);
    if (!quote) {
      return reply.notFound("Orçamento não encontrado");
    }
    return reply.send(quote);
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = quoteIdParamsSchema.parse(request.params);
    const payload = updateQuoteStatusSchema.parse(request.body);
    const quote = await this.service.updateStatus(params.id, payload.status);
    if (!quote) {
      return reply.notFound("Orçamento não encontrado");
    }
    return reply.send(quote);
  };

  approveAndConvert = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = quoteIdParamsSchema.parse(request.params);
    await this.service.updateStatus(params.id, "approved");
    const order = await this.service.convertToOrder(params.id);
    return reply.send(order);
  };
}
