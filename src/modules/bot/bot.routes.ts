import { FastifyPluginAsync } from "fastify";
import { parsePagination } from "../../shared/pagination";
import { CustomerRepository } from "../customer/customer.repository";
import { CustomerService } from "../customer/customer.service";
import { InventoryService } from "../inventory/inventory.service";
import { OrderRepository } from "../order/order.repository";
import { OrderService } from "../order/order.service";
import { PaymentRepository } from "../payment/payment.repository";
import { PaymentService } from "../payment/payment.service";
import { ProductRepository } from "../product/product.repository";
import { ProductService } from "../product/product.service";
import { QuoteService } from "../quote/quote.service";
import {
  botCreateOrderSchema,
  botCustomerSchema,
  botOrderIdParamsSchema,
  botOrderItemSchema,
  botProductIdParamsSchema,
  botProductsQuerySchema,
  botQuoteSchema
} from "./bot.schemas";

export const botRoutes: FastifyPluginAsync = async (app) => {
  const customerService = new CustomerService(new CustomerRepository());
  const productService = new ProductService(new ProductRepository());
  const inventoryService = new InventoryService();
  const orderService = new OrderService(new OrderRepository(), inventoryService);
  const paymentService = new PaymentService(new PaymentRepository(), inventoryService);
  const quoteService = new QuoteService();

  app.get("/products", async (request, reply) => {
    const query = botProductsQuerySchema.parse(request.query);
    const { page, limit, skip } = parsePagination(query);
    const { items, total } = await productService.findPaginated(skip, limit);
    return reply.send({
      page,
      limit,
      total,
      items: items.map((item) => ({
        id: item._id,
        name: item.name,
        description: item.basicDescription,
        stock: item.stock - item.reservedStock,
        image: item.imageUrl
      }))
    });
  });

  app.get("/products/:id", async (request, reply) => {
    const params = botProductIdParamsSchema.parse(request.params);
    const product = await productService.findById(params.id);
    if (!product) {
      return reply.notFound("Produto não encontrado");
    }
    return reply.send({
      id: product._id,
      name: product.name,
      description: product.fullDescription,
      price: product.salePrice,
      stock: product.stock - product.reservedStock,
      image: product.imageUrl
    });
  });

  app.post("/customers", async (request, reply) => {
    const payload = botCustomerSchema.parse(request.body);
    const customer = await customerService.upsertByPhone(payload.phone, payload);
    return reply.send(customer);
  });

  app.post("/assist", async (request, reply) => {
    const body = request.body as { message?: string } | undefined;
    const message = body?.message?.toLowerCase() ?? "";
    if (message.includes("produto") || message.includes("catalogo")) {
      const { items } = await productService.findPaginated(0, 5);
      return reply.send({
        reply: "Posso te ajudar com nosso catálogo. Aqui estão alguns produtos:",
        products: items.map((item) => ({
          id: item._id,
          name: item.name,
          price: item.salePrice
        }))
      });
    }
    if (message.includes("pedido")) {
      return reply.send({
        reply: "Para criar pedido, envie os itens e quantidade. Posso montar um orçamento antes."
      });
    }
    return reply.send({
      reply: "Olá! Posso ajudar com catálogo, orçamento, pedido e pagamento."
    });
  });

  app.post("/orders", async (request, reply) => {
    const payload = botCreateOrderSchema.parse(request.body);
    const existingCustomer = await customerService.findByPhone(payload.phone);
    const customer = existingCustomer
      ? existingCustomer
      : await customerService.upsertByPhone(payload.phone, `Cliente ${payload.phone}`);
    const order = await orderService.createOrder({
      customerId: customer._id.toString(),
      items: payload.items
    });
    return reply.code(201).send(order);
  });

  app.post("/orders/:id/items", async (request, reply) => {
    const params = botOrderIdParamsSchema.parse(request.params);
    const payload = botOrderItemSchema.parse(request.body);
    const order = await orderService.addItem(params.id, payload);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send(order);
  });

  app.post("/orders/:id/checkout", async (request, reply) => {
    const params = botOrderIdParamsSchema.parse(request.params);
    const order = await orderService.getById(params.id);
    if (!order) {
      return reply.notFound("Pedido não encontrado");
    }
    return reply.send({
      id: order._id,
      status: order.status,
      total: order.total,
      items: order.items.length
    });
  });

  app.post("/orders/:id/pay", async (request, reply) => {
    const params = botOrderIdParamsSchema.parse(request.params);
    const payment = await paymentService.payOrder(params.id);
    const order = await orderService.getById(params.id);
    return reply.send({
      success: true,
      transactionId: payment.transactionId,
      order: {
        id: order?._id,
        status: order?.status,
        total: order?.total
      }
    });
  });

  app.post("/quotes", async (request, reply) => {
    const payload = botQuoteSchema.parse(request.body);
    const existingCustomer = await customerService.findByPhone(payload.phone);
    const customer = existingCustomer
      ? existingCustomer
      : await customerService.upsertByPhone(payload.phone, { name: `Cliente ${payload.phone}` });
    const quote = await quoteService.create({
      customerId: customer._id.toString(),
      items: payload.items
    });
    return reply.code(201).send(quote);
  });

  app.post("/quotes/:id/approve", async (request, reply) => {
    const params = botOrderIdParamsSchema.parse(request.params);
    const order = await quoteService.convertToOrder(params.id);
    return reply.send({
      success: true,
      message: "Orçamento aprovado e convertido em pedido",
      order
    });
  });
};
