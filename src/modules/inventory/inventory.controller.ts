import { FastifyReply, FastifyRequest } from "fastify";
import { updateInventoryParamsSchema, updateInventorySchema } from "./inventory.schemas";
import { InventoryService } from "./inventory.service";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const inventory = await this.service.list();
    return reply.send(inventory);
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = updateInventoryParamsSchema.parse(request.params);
    const payload = updateInventorySchema.parse(request.body);
    const product = await this.service.setStock(params.productId, payload.stock);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }
    return reply.send(product);
  };
}
