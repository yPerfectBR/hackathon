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

const customers = [
  {
    name: "João Silva",
    phone: "5511999000001",
    whatsapp: "5511999000001",
    cpfCnpj: "12345678901",
    address: {
      street: "Rua das Flores",
      number: "100",
      district: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01001000",
      complement: ""
    }
  },
  {
    name: "Maria Souza",
    phone: "5511999000002",
    whatsapp: "5511999000002",
    cpfCnpj: "98765432100",
    address: {
      street: "Av. Paulista",
      number: "1500",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01311000",
      complement: "Conj. 12"
    }
  },
  {
    name: "Empresa XPTO LTDA",
    phone: "5511999000003",
    whatsapp: "5511999000003",
    cpfCnpj: "12345678000195",
    address: {
      street: "Rua do Comércio",
      number: "45",
      district: "Industrial",
      city: "Campinas",
      state: "SP",
      zipCode: "13015000",
      complement: ""
    }
  }
];

const products = [
  {
    code: "SKU-001",
    name: "Mouse Gamer Pro",
    basicDescription: "Mouse RGB para jogos",
    fullDescription: "Mouse gamer com sensor óptico de alta precisão e 7 botões programáveis.",
    imageUrl: "https://placehold.co/600x400?text=Mouse+Gamer+Pro",
    salePrice: 159.9,
    productionCost: 70,
    ncm: "84716053",
    stock: 35,
    reservedStock: 0,
    isFeatured: true
  },
  {
    code: "SKU-002",
    name: "Teclado Mecânico TKL",
    basicDescription: "Teclado mecânico compacto",
    fullDescription: "Teclado mecânico TKL com switches azuis e iluminação em LED branco.",
    imageUrl: "https://placehold.co/600x400?text=Teclado+Mecanico",
    salePrice: 289.9,
    productionCost: 130,
    ncm: "84716052",
    stock: 20,
    reservedStock: 0,
    isFeatured: true
  },
  {
    code: "SKU-003",
    name: "Headset Surround 7.1",
    basicDescription: "Headset com microfone removível",
    fullDescription: "Headset com som surround 7.1 virtual, microfone removível e conexão USB.",
    imageUrl: "https://placehold.co/600x400?text=Headset+7.1",
    salePrice: 349.9,
    productionCost: 180,
    ncm: "85183000",
    stock: 18,
    reservedStock: 0,
    isFeatured: false
  },
  {
    code: "SKU-004",
    name: "Webcam Full HD",
    basicDescription: "Webcam 1080p com foco automático",
    fullDescription: "Webcam Full HD com foco automático e microfone embutido para reuniões.",
    imageUrl: "https://placehold.co/600x400?text=Webcam+FHD",
    salePrice: 219.9,
    productionCost: 95,
    ncm: "85258929",
    stock: 25,
    reservedStock: 0,
    isFeatured: false
  }
];

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

  for (const customer of customers) {
    await CustomerModel.findOneAndUpdate(
      { phone: customer.phone },
      { $set: customer },
      { upsert: true, returnDocument: "after" }
    );
  }

  for (const product of products) {
    await ProductModel.findOneAndUpdate(
      { code: product.code },
      { $set: product },
      { upsert: true, returnDocument: "after" }
    );
  }

  const existingOrders = await OrderModel.countDocuments();
  if (existingOrders === 0) {
    const inventoryService = new InventoryService();
    const orderService = new OrderService(new OrderRepository(), inventoryService);
    const paymentService = new PaymentService(new PaymentRepository(), inventoryService);

    const [customerOne, customerTwo, customerThree] = await Promise.all([
      CustomerModel.findOne({ phone: "5511999000001" }),
      CustomerModel.findOne({ phone: "5511999000002" }),
      CustomerModel.findOne({ phone: "5511999000003" })
    ]);

    const [mouse, keyboard, headset, webcam] = await Promise.all([
      ProductModel.findOne({ code: "SKU-001" }),
      ProductModel.findOne({ code: "SKU-002" }),
      ProductModel.findOne({ code: "SKU-003" }),
      ProductModel.findOne({ code: "SKU-004" })
    ]);

    if (!customerOne || !customerTwo || !customerThree || !mouse || !keyboard || !headset || !webcam) {
      throw new Error("Seed base incompleto: não foi possível localizar clientes/produtos para gerar relatórios.");
    }

    const paidOrderOne = await orderService.createOrder({
      customerId: customerOne._id.toString(),
      items: [
        { productId: headset._id.toString(), quantity: 2 }
      ]
    });
    await paymentService.payOrder(paidOrderOne._id.toString());

    const paidOrderTwo = await orderService.createOrder({
      customerId: customerTwo._id.toString(),
      items: [
        { productId: mouse._id.toString(), quantity: 1 },
        { productId: webcam._id.toString(), quantity: 1 }
      ]
    });
    await paymentService.payOrder(paidOrderTwo._id.toString());

    await orderService.createOrder({
      customerId: customerThree._id.toString(),
      items: [
        { productId: keyboard._id.toString(), quantity: 1 }
      ]
    });
  }

  const customerCount = await CustomerModel.countDocuments();
  const productCount = await ProductModel.countDocuments();
  const orderCount = await OrderModel.countDocuments();
  const paidOrders = await OrderModel.countDocuments({ status: "paid" });
  const pendingOrders = await OrderModel.countDocuments({ status: "pending" });
  console.log(
    `Seed concluído. Clientes: ${customerCount} | Produtos: ${productCount} | Pedidos: ${orderCount} (paid=${paidOrders}, pending=${pendingOrders})`
  );

  await disconnectDatabase();
}

void run();
