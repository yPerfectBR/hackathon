import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { closeTestApp, createTestApp } from "./helpers/test-app";

let app: FastifyInstance;

describe("Template API", () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it("deve criar cadastros base completos", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente Base",
      phone: "5511999999010",
      whatsapp: "5511999999010",
      cpfCnpj: "12345678901",
      address: {
        street: "Rua A",
        number: "100",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000000"
      }
    });
    expect(customerResponse.status).toBe(201);

    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-001",
      name: "Produto Base",
      basicDescription: "Desc curta",
      fullDescription: "Desc completa",
      salePrice: 100,
      productionCost: 30,
      ncm: "12345678",
      stock: 10
    });
    expect(productResponse.status).toBe(201);
  });

  it("deve criar pedido com reserva de estoque", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente 1",
      phone: "5511999999001",
      cpfCnpj: "12345678902",
      address: {
        street: "Rua B",
        number: "101",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000001"
      }
    });
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-002",
      name: "Produto A",
      basicDescription: "Desc curta",
      fullDescription: "Desc completa",
      salePrice: 100,
      productionCost: 30,
      ncm: "12345678",
      stock: 10
    });

    const orderResponse = await request(app.server).post("/orders").send({
      customerId: customerResponse.body._id,
      items: [{ productId: productResponse.body._id, quantity: 3 }]
    });

    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body.status).toBe("pending");
    expect(orderResponse.body.total).toBe(300);

    const inventoryResponse = await request(app.server).get("/inventory");
    expect(inventoryResponse.status).toBe(200);
    const productInventory = inventoryResponse.body.find(
      (item: { _id: string }) => item._id === productResponse.body._id
    );
    expect(productInventory.reservedStock).toBe(3);
    expect(productInventory.stock).toBe(10);
  });

  it("deve bloquear pedido sem estoque disponível", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente 2",
      phone: "5511999999002",
      cpfCnpj: "12345678903",
      address: {
        street: "Rua C",
        number: "102",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000002"
      }
    });
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-003",
      name: "Produto B",
      basicDescription: "Desc curta B",
      fullDescription: "Desc completa B",
      salePrice: 50,
      productionCost: 10,
      ncm: "12345679",
      stock: 1
    });

    const failedOrder = await request(app.server).post("/orders").send({
      customerId: customerResponse.body._id,
      items: [{ productId: productResponse.body._id, quantity: 2 }]
    });

    expect(failedOrder.status).toBe(400);
    expect(failedOrder.body.message).toContain("Estoque insuficiente");
  });

  it("deve pagar pedido e efetivar baixa no estoque", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente 3",
      phone: "5511999999003",
      cpfCnpj: "12345678904",
      address: {
        street: "Rua D",
        number: "103",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000003"
      }
    });
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-004",
      name: "Produto C",
      basicDescription: "Desc curta C",
      fullDescription: "Desc completa C",
      salePrice: 40,
      productionCost: 12,
      ncm: "12345680",
      stock: 5
    });
    const orderResponse = await request(app.server).post("/orders").send({
      customerId: customerResponse.body._id,
      items: [{ productId: productResponse.body._id, quantity: 2 }]
    });

    const paymentResponse = await request(app.server).post(`/payments/${orderResponse.body._id}/pay`).send();
    expect(paymentResponse.status).toBe(200);
    expect(paymentResponse.body.transactionId).toBeTypeOf("string");

    const orderAfterPayment = await request(app.server).get(`/orders/${orderResponse.body._id}`);
    expect(orderAfterPayment.status).toBe(200);
    expect(orderAfterPayment.body.status).toBe("paid");

    const inventoryResponse = await request(app.server).get("/inventory");
    const productInventory = inventoryResponse.body.find(
      (item: { _id: string }) => item._id === productResponse.body._id
    );
    expect(productInventory.stock).toBe(3);
    expect(productInventory.reservedStock).toBe(0);

    const financeResponse = await request(app.server).get(`/finance/${orderResponse.body._id}`);
    expect(financeResponse.status).toBe(200);
    expect(financeResponse.body.status).toBe("paid");

    const fiscalResponse = await request(app.server).get(`/fiscal/${orderResponse.body._id}`);
    expect(fiscalResponse.status).toBe(200);
    expect(fiscalResponse.body.status).toBe("issued");
  });

  it("deve converter orçamento aprovado em pedido", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente Quote",
      phone: "5511999999008",
      cpfCnpj: "12345678908",
      address: {
        street: "Rua E",
        number: "104",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000004"
      }
    });
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-005",
      name: "Produto Quote",
      basicDescription: "Desc quote",
      fullDescription: "Desc quote completa",
      salePrice: 70,
      productionCost: 20,
      ncm: "12345681",
      stock: 8
    });

    const quoteResponse = await request(app.server).post("/quotes").send({
      customerId: customerResponse.body._id,
      items: [{ productId: productResponse.body._id, quantity: 2 }]
    });
    expect(quoteResponse.status).toBe(201);

    const approveResponse = await request(app.server).post(`/quotes/${quoteResponse.body._id}/approve`).send();
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.quoteId).toBe(quoteResponse.body._id);
  });

  it("deve executar fluxo bot end-to-end", async () => {
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-006",
      name: "Produto Bot",
      basicDescription: "Bot curta",
      fullDescription: "Bot completa",
      salePrice: 70,
      productionCost: 20,
      ncm: "12345682",
      stock: 8
    });

    const botCustomerResponse = await request(app.server).post("/bot/customers").send({
      phone: "5511999999004",
      name: "Cliente Bot"
    });
    expect(botCustomerResponse.status).toBe(200);

    const botListResponse = await request(app.server).get("/bot/products?page=1&limit=10");
    expect(botListResponse.status).toBe(200);
    expect(botListResponse.body.items.length).toBeGreaterThan(0);

    const botOrderResponse = await request(app.server).post("/bot/orders").send({
      phone: "5511999999004",
      items: [{ productId: productResponse.body._id, quantity: 1 }]
    });
    expect(botOrderResponse.status).toBe(201);

    const checkoutResponse = await request(app.server).post(`/bot/orders/${botOrderResponse.body._id}/checkout`).send();
    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body.status).toBe("pending");

    const payResponse = await request(app.server).post(`/bot/orders/${botOrderResponse.body._id}/pay`).send();
    expect(payResponse.status).toBe(200);
    expect(payResponse.body.success).toBe(true);
    expect(payResponse.body.transactionId).toBeTypeOf("string");

    const dashboardResponse = await request(app.server).get("/management/dashboard");
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body).toHaveProperty("ordersTotal");
  });

  it("deve atender mensagem de mock whatsapp e cadastrar cliente no primeiro contato", async () => {
    const chatResponse = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511998888777",
      name: "Cliente Chat",
      message: "/help"
    });

    expect(chatResponse.status).toBe(200);
    expect(chatResponse.body.reply).toContain("Comandos disponíveis");

    const customerResponse = await request(app.server).get("/customers/phone/5511998888777");
    expect(customerResponse.status).toBe(200);
    expect(customerResponse.body.name).toBe("Cliente Chat");
    expect(customerResponse.body.whatsapp).toBe("5511998888777");
  });

  it("deve conduzir compra no chat e pagar com /pagar sem id", async () => {
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-CHAT-01",
      name: "Headset Surround 7.1",
      basicDescription: "Headset gamer",
      fullDescription: "Headset gamer com som 7.1",
      salePrice: 349.9,
      productionCost: 180,
      ncm: "85183000",
      stock: 5
    });
    expect(productResponse.status).toBe(201);

    const firstMessage = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777000",
      name: "Cliente Conversa",
      message: "quero comprar o headset surround 7.1"
    });
    expect(firstMessage.status).toBe(200);
    expect(firstMessage.body.reply).toContain("Quer que eu adicione");

    const confirmMessage = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777000",
      message: "sim"
    });
    expect(confirmMessage.status).toBe(200);
    expect(confirmMessage.body.reply).toContain("adicionado(s) ao carrinho");

    const closeCartMessage = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777000",
      message: "só isso"
    });
    expect(closeCartMessage.status).toBe(200);
    expect(closeCartMessage.body.reply).toContain("Pedido criado com sucesso");
    expect(closeCartMessage.body.reply).toContain("OrderID:");
    expect(closeCartMessage.body.reply).toContain("rode apenas /pagar");

    const orderIdMatch = closeCartMessage.body.reply.match(/OrderID:\s*([a-f0-9]{24})/i);
    expect(orderIdMatch).not.toBeNull();
    const createdOrderId = orderIdMatch?.[1];

    const askToPayMessage = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777000",
      message: "quero pagar agora"
    });
    expect(askToPayMessage.status).toBe(200);
    expect(askToPayMessage.body.reply).toContain(`OrderID ${createdOrderId}`);
    expect(askToPayMessage.body.reply).toContain("rode apenas /pagar");

    const payMessage = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777000",
      message: "/pagar"
    });
    expect(payMessage.status).toBe(200);
    expect(payMessage.body.reply).toContain("Pagamento confirmado");
  });

  it("deve manter contexto do ultimo produto para compra com referencia indireta", async () => {
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-CHAT-CTX-01",
      name: "Mouse Gamer Pro",
      basicDescription: "Mouse para jogos",
      fullDescription: "Mouse gamer com RGB",
      salePrice: 159.9,
      productionCost: 70,
      ncm: "84716053",
      stock: 12
    });
    expect(productResponse.status).toBe(201);

    const askProduct = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777111",
      name: "Cliente Contexto",
      message: "gostaria de comprar o mouse gamer pro"
    });
    expect(askProduct.status).toBe(200);
    expect(askProduct.body.reply).toContain("Quer que eu adicione");

    const addByPronoun = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777111",
      message: "sim"
    });
    expect(addByPronoun.status).toBe(200);
    expect(addByPronoun.body.reply).toContain("adicionado(s) ao carrinho");

    const buyByPronoun = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997777111",
      message: "quero comprar ele"
    });
    expect(buyByPronoun.status).toBe(200);
    expect(buyByPronoun.body.reply).toContain("Quer que eu adicione");
  });

  it("deve aprovar orçamento via comando /aprovar sem erro interno", async () => {
    const customerResponse = await request(app.server).post("/customers").send({
      name: "Cliente Comando Aprovar",
      phone: "5511997333444",
      cpfCnpj: "12345678966",
      address: {
        street: "Rua F",
        number: "200",
        district: "Centro",
        city: "Sao Paulo",
        state: "SP",
        zipCode: "01000005"
      }
    });
    expect(customerResponse.status).toBe(201);

    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-CHAT-APR-01",
      name: "Webcam Full HD",
      basicDescription: "Webcam",
      fullDescription: "Webcam para video",
      salePrice: 219.9,
      productionCost: 90,
      ncm: "85258929",
      stock: 10
    });
    expect(productResponse.status).toBe(201);

    const quoteResponse = await request(app.server).post("/quotes").send({
      customerId: customerResponse.body._id,
      items: [{ productId: productResponse.body._id, quantity: 1 }]
    });
    expect(quoteResponse.status).toBe(201);

    const approveByChat = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997333444",
      message: `/aprovar ${quoteResponse.body._id}`
    });
    expect(approveByChat.status).toBe(200);
    expect(approveByChat.body.reply).toContain("Orçamento aprovado.");
    expect(approveByChat.body.reply).toContain("Pedido:");
  });

  it("deve montar carrinho por comando e gerar pedido com /pedido", async () => {
    const firstProduct = await request(app.server).post("/products").send({
      code: "SKU-CART-01",
      name: "Produto Carrinho A",
      basicDescription: "Item A",
      fullDescription: "Item A completo",
      salePrice: 50,
      productionCost: 20,
      ncm: "11111111",
      stock: 10
    });
    const secondProduct = await request(app.server).post("/products").send({
      code: "SKU-CART-02",
      name: "Produto Carrinho B",
      basicDescription: "Item B",
      fullDescription: "Item B completo",
      salePrice: 30,
      productionCost: 12,
      ncm: "22222222",
      stock: 10
    });
    expect(firstProduct.status).toBe(201);
    expect(secondProduct.status).toBe(201);

    const addFirst = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997444555",
      name: "Cliente Carrinho",
      message: `/carrinho ${firstProduct.body._id} 2`
    });
    expect(addFirst.status).toBe(200);
    expect(addFirst.body.reply).toContain("adicionado(s) ao carrinho");

    const addSecond = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997444555",
      message: "/carrinho Produto Carrinho B 1"
    });
    expect(addSecond.status).toBe(200);
    expect(addSecond.body.reply).toContain("Produto Carrinho B");

    const createOrder = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997444555",
      message: "/pedido"
    });
    expect(createOrder.status).toBe(200);
    expect(createOrder.body.reply).toContain("Pedido criado com sucesso");
    expect(createOrder.body.reply).toContain("OrderID:");
    expect(createOrder.body.reply).toContain("digite apenas /pagar");
  });

  it("deve aceitar comando com slash fullwidth e espacos invisiveis", async () => {
    const productResponse = await request(app.server).post("/products").send({
      code: "SKU-CMD-INV-01",
      name: "Produto Invisivel",
      basicDescription: "desc",
      fullDescription: "desc completa",
      salePrice: 42,
      productionCost: 10,
      ncm: "33333333",
      stock: 5
    });
    expect(productResponse.status).toBe(201);

    const response = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997666777",
      name: "Cliente Slash",
      message: `\u200B／carrinho ${productResponse.body._id} 1`
    });
    expect(response.status).toBe(200);
    expect(response.body.reply).toContain("adicionado(s) ao carrinho");
  });

  it("deve responder mensagem sem barra de forma conversacional", async () => {
    const response = await request(app.server).post("/chat/mock-whatsapp/message").send({
      phone: "5511997000111",
      name: "Cliente Bom Dia",
      message: "bom dia"
    });

    expect(response.status).toBe(200);
    expect(response.body.reply).toContain("Posso te ajudar");
  });
});
