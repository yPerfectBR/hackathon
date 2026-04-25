import { FastifyReply, FastifyRequest } from "fastify";
import {
  createCustomerSchema,
  customerIdParamsSchema,
  phoneParamsSchema,
  upsertCustomerByPhoneSchema
} from "./customer.schemas";
import { CustomerService } from "./customer.service";

export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = createCustomerSchema.parse(request.body);
    const customer = await this.service.create(payload);
    return reply.code(201).send(customer);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = customerIdParamsSchema.parse(request.params);
    const customer = await this.service.findById(params.id);
    if (!customer) {
      return reply.notFound("Cliente não encontrado");
    }
    return reply.send(customer);
  };

  getByPhone = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = phoneParamsSchema.parse(request.params);
    const customer = await this.service.findByPhone(params.phone);
    if (!customer) {
      return reply.notFound("Cliente não encontrado");
    }
    return reply.send(customer);
  };

  getOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = customerIdParamsSchema.parse(request.params);
    const customer = await this.service.findById(params.id);
    if (!customer) {
      return reply.notFound("Cliente não encontrado");
    }
    const orders = await this.service.listOrders(params.id);
    return reply.send(orders);
  };

  upsertByPhone = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = upsertCustomerByPhoneSchema.parse(request.body);
    const customer = await this.service.upsertByPhone(payload.phone, payload);
    return reply.send(customer);
  };
}
