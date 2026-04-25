import { FastifyReply, FastifyRequest } from "fastify";
import {
  addOrderItemSchema,
  createOrderSchema,
  customerIdParamsSchema,
  orderIdParamsSchema,
  removeOrderItemSchema,
  updateLogisticStatusSchema,
  updateOrderStatusSchema
} from "./order.schemas";
import { OrderService } from "./order.service";

export class OrderController {
  constructor(private readonly service: OrderService) {}

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = createOrderSchema.parse(request.body);
    const order = await this.service.createOrder(payload);
    return reply.code(201).send(order);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const order = await this.service.getById(params.id);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  };

  getByCustomer = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = customerIdParamsSchema.parse(request.params);
    const orders = await this.service.getByCustomer(params.customerId);
    return reply.send(orders);
  };

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payload = updateOrderStatusSchema.parse(request.body);
    const order = await this.service.updateStatus(params.id, payload.status);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  };

  updateLogisticStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payload = updateLogisticStatusSchema.parse(request.body);
    const order = await this.service.updateLogisticStatus(params.id, payload.logisticStatus);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  };

  addItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payload = addOrderItemSchema.parse(request.body);
    const order = await this.service.addItem(params.id, payload);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  };

  removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = orderIdParamsSchema.parse(request.params);
    const payload = removeOrderItemSchema.parse(request.body);
    const order = await this.service.removeItem(params.id, payload.productId);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  };
}
