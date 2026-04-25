import { CustomerModel } from "../customer/customer.model";
import { FinanceModel } from "../finance/finance.model";
import { InventoryService } from "../inventory/inventory.service";
import { ProductModel } from "../product/product.model";
import { OrderModel } from "../order/order.model";
import { QuoteModel } from "./quote.model";

export class QuoteService {
  private readonly inventoryService = new InventoryService();

  async create(payload: {
    customerId: string;
    items: Array<{ productId: string; quantity: number; discount?: number }>;
  }) {
    const customer = await CustomerModel.findById(payload.customerId);
    if (!customer) {
      throw new Error("Cliente não encontrado");
    }

    const items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      subtotal: number;
    }> = [];

    for (const item of payload.items) {
      const product = await ProductModel.findById(item.productId);
      if (!product) {
        throw new Error(`Produto ${item.productId} não encontrado`);
      }
      const discount = item.discount ?? 0;
      const subtotal = Math.max(0, (product.salePrice * item.quantity) - discount);
      items.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        discount,
        subtotal
      });
    }

    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    return QuoteModel.create({
      customerId: payload.customerId,
      items,
      status: "sent",
      total
    });
  }

  async findById(id: string) {
    return QuoteModel.findById(id);
  }

  async updateStatus(id: string, status: "draft" | "sent" | "approved" | "rejected") {
    return QuoteModel.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
  }

  async convertToOrder(id: string) {
    const quote = await QuoteModel.findById(id);
    if (!quote) {
      throw new Error("Orçamento não encontrado");
    }
    if (quote.status !== "approved") {
      throw new Error("Apenas orçamento aprovado pode ser convertido");
    }
    for (const item of quote.items) {
      await this.inventoryService.reserve(item.productId.toString(), item.quantity);
    }

    const order = await OrderModel.create({
      customerId: quote.customerId,
      items: quote.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity
      })),
      status: "pending",
      logisticStatus: "open",
      total: quote.total,
      quoteId: quote._id
    });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    await FinanceModel.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        amount: quote.total,
        paymentMethod: "pix",
        dueDate,
        status: "pending"
      },
      { upsert: true, returnDocument: "after" }
    );
    quote.status = "converted";
    await quote.save();
    return order;
  }
}
