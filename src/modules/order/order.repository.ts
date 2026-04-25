import { OrderModel } from "./order.model";

export class OrderRepository {
  async create(data: Record<string, unknown>) {
    return OrderModel.create(data);
  }

  async findById(id: string) {
    return OrderModel.findById(id);
  }

  async findByCustomer(customerId: string) {
    return OrderModel.find({ customerId }).sort({ createdAt: -1 });
  }
}
