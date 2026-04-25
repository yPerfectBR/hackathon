import { config } from "dotenv";
import { env } from "node:process";
import { connectDatabase, disconnectDatabase } from "../src/database/mongoose";
import { CustomerModel } from "../src/modules/customer/customer.model";
import { InventoryService } from "../src/modules/inventory/inventory.service";
import { OrderRepository } from "../src/modules/order/order.repository";
import { OrderService } from "../src/modules/order/order.service";
import { OrderModel } from "../src/modules/order/order.model";
import { PaymentRepository } from "../src/modules/payment/payment.repository";
import { PaymentService } from "../src/modules/payment/payment.service";
import { ProductModel } from "../src/modules/product/product.model";

config();

const mongoUri = env.MONGO_URI ?? "mongodb://127.0.0.1:27017/template_db";
const fallbackMongoUri = "mongodb://127.0.0.1:27017/template_db";
const SALES_TO_GENERATE = 30;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLastMonths(monthsBack: number) {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(now.getMonth() - monthsBack);
  const ts = randomInt(start.getTime(), now.getTime());
  return new Date(ts);
}

async function run() {
  try {
    await connectDatabase(mongoUri);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const shouldFallback = mongoUri !== fallbackMongoUri && message.includes("ENOTFOUND mongo");
    if (!shouldFallback) {
      throw error;
    }
    console.warn(`Falha ao conectar em ${mongoUri}. Tentando fallback em ${fallbackMongoUri}.`);
    await connectDatabase(fallbackMongoUri);
  }

  const customers = await CustomerModel.find().select("_id name");
  const products = await ProductModel.find().select("_id name stock reservedStock");

  if (customers.length === 0 || products.length === 0) {
    throw new Error("Sem clientes/produtos para gerar vendas. Rode antes: npm run seed");
  }

  const inventoryService = new InventoryService();
  const orderService = new OrderService(new OrderRepository(), inventoryService);
  const paymentService = new PaymentService(new PaymentRepository(), inventoryService);

  let created = 0;
  let attempts = 0;
  const maxAttempts = SALES_TO_GENERATE * 10;

  while (created < SALES_TO_GENERATE && attempts < maxAttempts) {
    attempts += 1;

    const customer = customers[randomInt(0, customers.length - 1)];
    const product = products[randomInt(0, products.length - 1)];
    const quantity = randomInt(1, 3);

    try {
      const order = await orderService.createOrder({
        customerId: customer._id.toString(),
        items: [{ productId: product._id.toString(), quantity }]
      });
      await paymentService.payOrder(order._id.toString());

      const createdAt = randomDateWithinLastMonths(12);
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { createdAt, updatedAt: createdAt } }
      );
      created += 1;
    } catch {
      // ignora tentativas com estoque insuficiente e tenta outro produto
    }
  }

  const paidOrders = await OrderModel.countDocuments({ status: "paid" });
  console.log(`Vendas aleatórias geradas: ${created}. Total de pedidos pagos no banco: ${paidOrders}`);

  await disconnectDatabase();
}

void run();
