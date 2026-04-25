import { CustomerModel } from "../customer/customer.model";
import { FinanceModel } from "../finance/finance.model";
import { InventoryService } from "../inventory/inventory.service";
import { ProductModel } from "../product/product.model";
import { OrderModel, OrderStatus } from "./order.model";
import { OrderRepository } from "./order.repository";

type NewItemInput = { productId: string; quantity: number };

export class OrderService {
  constructor(
    private readonly repository: OrderRepository,
    private readonly inventoryService: InventoryService
  ) {}

  private async buildOrderItems(items: NewItemInput[]) {
    const builtItems: Array<{
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const product = await ProductModel.findById(item.productId);
      if (!product) {
        throw new Error(`Produto ${item.productId} não encontrado`);
      }
      await this.inventoryService.reserve(item.productId, item.quantity);
      builtItems.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.salePrice,
        quantity: item.quantity
      });
    }
    return builtItems;
  }

  private calculateTotal(items: Array<{ unitPrice: number; quantity: number }>) {
    return items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  }

  async createOrder(payload: { customerId: string; items: NewItemInput[] }) {
    const customer = await CustomerModel.findById(payload.customerId);
    if (!customer) {
      throw new Error("Cliente não encontrado");
    }

    const items = await this.buildOrderItems(payload.items);
    const total = this.calculateTotal(items);

    const order = await this.repository.create({
      customerId: payload.customerId,
      items,
      status: "pending",
      logisticStatus: "open",
      total
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    await FinanceModel.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        amount: total,
        paymentMethod: "pix",
        dueDate,
        status: "pending"
      },
      { upsert: true, returnDocument: "after" }
    );

    return order;
  }

  async getById(orderId: string) {
    return this.repository.findById(orderId);
  }

  async getByCustomer(customerId: string) {
    return this.repository.findByCustomer(customerId);
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return null;
    }

    if (status === "cancelled" && order.status === "pending") {
      for (const item of order.items) {
        await this.inventoryService.release(item.productId.toString(), item.quantity);
      }
    }

    order.status = status;
    await order.save();
    return order;
  }

  async updateLogisticStatus(orderId: string, logisticStatus: "open" | "production" | "delivered") {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return null;
    }
    order.logisticStatus = logisticStatus;
    await order.save();
    return order;
  }

  async addItem(orderId: string, payload: NewItemInput) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return null;
    }
    if (order.status !== "pending") {
      throw new Error("Só é possível editar pedidos pendentes");
    }

    const product = await ProductModel.findById(payload.productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }

    await this.inventoryService.reserve(payload.productId, payload.quantity);

    const existingItem = order.items.find(
      (item) => item.productId.toString() === payload.productId
    );
    if (existingItem) {
      existingItem.quantity += payload.quantity;
    } else {
      order.items.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.salePrice,
        quantity: payload.quantity
      });
    }
    order.total = this.calculateTotal(order.items);
    await order.save();
    return order;
  }

  async removeItem(orderId: string, productId: string) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return null;
    }
    if (order.status !== "pending") {
      throw new Error("Só é possível editar pedidos pendentes");
    }

    const item = order.items.find((entry) => entry.productId.toString() === productId);
    if (!item) {
      throw new Error("Item não encontrado no pedido");
    }

    await this.inventoryService.release(productId, item.quantity);
    order.items = order.items.filter((entry) => entry.productId.toString() !== productId);
    order.total = this.calculateTotal(order.items);
    await order.save();
    return order;
  }
}
