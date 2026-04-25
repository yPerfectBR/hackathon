import { FastifyReply, FastifyRequest } from "fastify";
import { parsePagination } from "../../shared/pagination";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  searchProductQuerySchema,
  updateProductSchema
} from "./product.schemas";
import { ProductService } from "./product.service";

export class ProductController {
  constructor(private readonly service: ProductService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listProductsQuerySchema.parse(request.query);
    const { page, limit, skip } = parsePagination(query);
    const { items, total } = await this.service.findPaginated(skip, limit);
    return reply.send({ page, limit, total, items });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = productIdParamsSchema.parse(request.params);
    const product = await this.service.findById(params.id);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }
    return reply.send(product);
  };

  search = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = searchProductQuerySchema.parse(request.query);
    const items = await this.service.searchByName(query.name);
    return reply.send(items);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = createProductSchema.parse(request.body);
    const product = await this.service.create(payload);
    return reply.code(201).send(product);
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = productIdParamsSchema.parse(request.params);
    const payload = updateProductSchema.parse(request.body);
    const product = await this.service.updateById(params.id, payload);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }
    return reply.send(product);
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = productIdParamsSchema.parse(request.params);
    const product = await this.service.deleteById(params.id);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }
    return reply.code(204).send();
  };
}
