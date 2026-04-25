import { FastifyPluginAsync } from "fastify";
import { chatMessageSchema, chatPhoneParamsSchema, chatProductQuerySchema } from "./chat.schemas";
import { ChatService } from "./chat.service";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  const service = new ChatService();

  app.post("/mock-whatsapp/message", async (request, reply) => {
    const payload = chatMessageSchema.parse(request.body);
    const response = await service.handleMockWhatsAppMessage(payload);
    return reply.send(response);
  });

  app.get("/context/products", async (request, reply) => {
    const query = chatProductQuerySchema.parse(request.query);
    const products = await service.searchProductContext(query.query);
    return reply.send(products);
  });

  app.get("/context/customer/:phone/orders", async (request, reply) => {
    const params = chatPhoneParamsSchema.parse(request.params);
    const data = await service.getCustomerOrdersByPhone(params.phone);
    if (!data) {
      return reply.notFound("Cliente não encontrado");
    }
    return reply.send({
      customer: {
        id: data.customer._id,
        name: data.customer.name,
        phone: data.customer.phone
      },
      orders: data.orders
    });
  });
};
