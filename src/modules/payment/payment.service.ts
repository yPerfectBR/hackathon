import { randomUUID } from "node:crypto";
import { FinanceModel } from "../finance/finance.model";
import { FiscalModel } from "../fiscal/fiscal.model";
import { InventoryService } from "../inventory/inventory.service";
import { OrderModel } from "../order/order.model";
import { PaymentRepository } from "./payment.repository";

export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly inventoryService: InventoryService
  ) {}

  async payOrder(orderId: string) {
    const existingPayment = await this.repository.findByOrder(orderId);
    if (existingPayment) {
      return existingPayment;
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new Error("Pedido não encontrado");
    }
    if (order.status !== "pending") {
      throw new Error("Apenas pedidos pendentes podem ser pagos");
    }

    for (const item of order.items) {
      await this.inventoryService.confirmDebit(item.productId.toString(), item.quantity);
    }

    order.status = "paid";
    await order.save();

    const payment = await this.repository.create({
      orderId: order._id,
      status: "paid",
      transactionId: randomUUID()
    });

    await FinanceModel.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        amount: order.total,
        paymentMethod: "pix",
        dueDate: new Date(),
        transactionCode: payment.transactionId,
        status: "paid"
      },
      { upsert: true, returnDocument: "after" }
    );

    await FiscalModel.findOneAndUpdate(
      { orderId: order._id },
      {
        orderId: order._id,
        accessKey: `NFE-${order._id.toString().slice(-10)}-${Date.now()}`,
        xmlPath: `/fiscal/xml/${order._id}.xml`,
        pdfPath: `/fiscal/pdf/${order._id}.pdf`,
        status: "issued"
      },
      { upsert: true, returnDocument: "after" }
    );

    return payment;
  }

  async getByOrder(orderId: string) {
    return this.repository.findByOrder(orderId);
  }
}
