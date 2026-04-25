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
  },
  {
    name: "Ana Pereira",
    phone: "5511999000004",
    whatsapp: "5511999000004",
    cpfCnpj: "45678912300",
    address: {
      street: "Rua das Acácias",
      number: "77",
      district: "Jardins",
      city: "São Paulo",
      state: "SP",
      zipCode: "01401000",
      complement: "Casa 2"
    }
  },
  {
    name: "Loja Central ME",
    phone: "5511999000005",
    whatsapp: "5511999000005",
    cpfCnpj: "98765432000110",
    address: {
      street: "Alameda Santos",
      number: "310",
      district: "Centro",
      city: "Santos",
      state: "SP",
      zipCode: "11010000",
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
    stock: 120,
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
    stock: 90,
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
    stock: 70,
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
    stock: 85,
    reservedStock: 0,
    isFeatured: false
  },
  {
    code: "SKU-005",
    name: "Monitor Gamer 27",
    basicDescription: "Monitor IPS 27 polegadas 165Hz",
    fullDescription: "Monitor gamer 27 polegadas, painel IPS, taxa de atualização de 165Hz e baixa latência.",
    imageUrl: "https://placehold.co/600x400?text=Monitor+27",
    salePrice: 1399.9,
    productionCost: 880,
    ncm: "85285220",
    stock: 45,
    reservedStock: 0,
    isFeatured: true
  },
  {
    code: "SKU-006",
    name: "Cadeira Ergonômica Pro",
    basicDescription: "Cadeira ergonômica com apoio lombar",
    fullDescription: "Cadeira ergonômica premium com ajuste de altura, inclinação e apoio lombar regulável.",
    imageUrl: "https://placehold.co/600x400?text=Cadeira+Pro",
    salePrice: 1899.9,
    productionCost: 1200,
    ncm: "94013010",
    stock: 30,
    reservedStock: 0,
    isFeatured: true
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

    const [customerOne, customerTwo, customerThree, customerFour, customerFive] = await Promise.all([
      CustomerModel.findOne({ phone: "5511999000001" }),
      CustomerModel.findOne({ phone: "5511999000002" }),
      CustomerModel.findOne({ phone: "5511999000003" }),
      CustomerModel.findOne({ phone: "5511999000004" }),
      CustomerModel.findOne({ phone: "5511999000005" })
    ]);

    const [mouse, keyboard, headset, webcam, monitor, chair] = await Promise.all([
      ProductModel.findOne({ code: "SKU-001" }),
      ProductModel.findOne({ code: "SKU-002" }),
      ProductModel.findOne({ code: "SKU-003" }),
      ProductModel.findOne({ code: "SKU-004" }),
      ProductModel.findOne({ code: "SKU-005" }),
      ProductModel.findOne({ code: "SKU-006" })
    ]);

    if (
      !customerOne || !customerTwo || !customerThree || !customerFour || !customerFive
      || !mouse || !keyboard || !headset || !webcam || !monitor || !chair
    ) {
      throw new Error("Seed base incompleto: não foi possível localizar clientes/produtos para gerar relatórios.");
    }

    const scenarios: Array<{
      customerId: string;
      items: Array<{ productId: string; quantity: number }>;
      isPaid: boolean;
      daysAgo: number;
    }> = [
      { customerId: customerOne._id.toString(), items: [{ productId: headset._id.toString(), quantity: 2 }], isPaid: true, daysAgo: 5 },
      { customerId: customerTwo._id.toString(), items: [{ productId: mouse._id.toString(), quantity: 3 }], isPaid: true, daysAgo: 12 },
      { customerId: customerThree._id.toString(), items: [{ productId: webcam._id.toString(), quantity: 2 }], isPaid: true, daysAgo: 18 },
      { customerId: customerFour._id.toString(), items: [{ productId: keyboard._id.toString(), quantity: 1 }, { productId: mouse._id.toString(), quantity: 2 }], isPaid: true, daysAgo: 28 },
      { customerId: customerFive._id.toString(), items: [{ productId: monitor._id.toString(), quantity: 1 }], isPaid: true, daysAgo: 39 },
      { customerId: customerOne._id.toString(), items: [{ productId: chair._id.toString(), quantity: 1 }], isPaid: true, daysAgo: 51 },
      { customerId: customerTwo._id.toString(), items: [{ productId: monitor._id.toString(), quantity: 1 }, { productId: headset._id.toString(), quantity: 1 }], isPaid: true, daysAgo: 64 },
      { customerId: customerThree._id.toString(), items: [{ productId: chair._id.toString(), quantity: 1 }, { productId: webcam._id.toString(), quantity: 1 }], isPaid: true, daysAgo: 77 },
      { customerId: customerFour._id.toString(), items: [{ productId: keyboard._id.toString(), quantity: 2 }], isPaid: false, daysAgo: 2 },
      { customerId: customerFive._id.toString(), items: [{ productId: mouse._id.toString(), quantity: 1 }, { productId: webcam._id.toString(), quantity: 1 }], isPaid: false, daysAgo: 9 }
    ];

    for (const scenario of scenarios) {
      const order = await orderService.createOrder({
        customerId: scenario.customerId,
        items: scenario.items
      });

      if (scenario.isPaid) {
        await paymentService.payOrder(order._id.toString());
      }

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - scenario.daysAgo);
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { createdAt, updatedAt: createdAt } }
      );
    }
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
