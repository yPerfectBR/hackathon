import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { ZodError } from "zod";
import { botRoutes } from "./modules/bot/bot.routes";
import { chatRoutes } from "./modules/chat/chat.routes";
import { customerRoutes } from "./modules/customer/customer.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { fiscalRoutes } from "./modules/fiscal/fiscal.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { managementRoutes } from "./modules/management/management.routes";
import { orderRoutes } from "./modules/order/order.routes";
import { paymentRoutes } from "./modules/payment/payment.routes";
import { productRoutes } from "./modules/product/product.routes";
import { quoteRoutes } from "./modules/quote/quote.routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  void app.register(cors, { origin: true });
  void app.register(sensible);
  void app.register(rateLimit, {
    global: false
  });

  app.get("/", async () => ({
    name: "ERP API",
    status: "online",
    health: "/health",
    dashboard: "/management/dashboard"
  }));
  app.get("/health", async () => ({ status: "ok" }));
  void app.register(productRoutes, { prefix: "/products" });
  void app.register(customerRoutes, { prefix: "/customers" });
  void app.register(orderRoutes, { prefix: "/orders" });
  void app.register(paymentRoutes, { prefix: "/payments" });
  void app.register(quoteRoutes, { prefix: "/quotes" });
  void app.register(financeRoutes, { prefix: "/finance" });
  void app.register(fiscalRoutes, { prefix: "/fiscal" });
  void app.register(inventoryRoutes, { prefix: "/inventory" });
  void app.register(managementRoutes, { prefix: "/management" });
  void app.register(chatRoutes, { prefix: "/chat" });
  void app.register(
    async (botApp) => {
      await botApp.register(botRoutes, { prefix: "/bot" });
    },
    {
      config: {
        rateLimit: {
          max: 40,
          timeWindow: "1 minute"
        }
      }
    }
  );

  app.setErrorHandler((error, _, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Dados inválidos",
        issues: error.issues
      });
    }
    if (error instanceof Error) {
      if (
        error.message.includes("não encontrado") ||
        error.message.includes("insuficiente") ||
        error.message.includes("pendentes") ||
        error.message.includes("reservado")
      ) {
        return reply.status(400).send({ message: error.message });
      }
    }
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        message: error.message
      });
    }
    app.log.error(error);
    return reply.status(500).send({ message: "Erro interno" });
  });

  return app;
}
