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
});
