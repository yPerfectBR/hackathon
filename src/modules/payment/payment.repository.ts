import { PaymentModel } from "./payment.model";

export class PaymentRepository {
  async create(data: Record<string, unknown>) {
    return PaymentModel.create(data);
  }

  async findByOrder(orderId: string) {
    return PaymentModel.findOne({ orderId });
  }
}
