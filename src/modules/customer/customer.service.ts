import { OrderModel } from "../order/order.model";
import { CustomerRepository } from "./customer.repository";

export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async create(payload: {
    name: string;
    phone: string;
    whatsapp?: string;
    cpfCnpj: string;
    address: {
      street: string;
      number: string;
      district: string;
      city: string;
      state: string;
      zipCode: string;
      complement?: string;
    };
  }) {
    return this.repository.create({
      ...payload,
      whatsapp: payload.whatsapp ?? payload.phone
    });
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async findByPhone(phone: string) {
    return this.repository.findByPhone(phone);
  }

  async upsertByPhone(
    phone: string,
    data: {
      name: string;
      cpfCnpj?: string;
      address?: {
        street: string;
        number: string;
        district: string;
        city: string;
        state: string;
        zipCode: string;
        complement?: string;
      };
    }
  ) {
    return this.repository.findByPhoneAndUpsert(phone, {
      name: data.name,
      whatsapp: phone,
      cpfCnpj: data.cpfCnpj,
      address: data.address
    });
  }

  async listOrders(customerId: string) {
    return OrderModel.find({ customerId }).sort({ createdAt: -1 });
  }
}
