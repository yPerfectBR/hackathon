import { CustomerModel } from "./customer.model";

export class CustomerRepository {
  async create(data: Record<string, unknown>) {
    return CustomerModel.create(data);
  }

  async findById(id: string) {
    return CustomerModel.findById(id);
  }

  async findByPhone(phone: string) {
    return CustomerModel.findOne({
      $or: [{ phone }, { whatsapp: phone }]
    });
  }

  async findByPhoneAndUpsert(phone: string, data: Record<string, unknown>) {
    const payload = {
      ...data,
      phone,
      whatsapp: phone
    };
    return CustomerModel.findOneAndUpdate(
      { $or: [{ phone }, { whatsapp: phone }] },
      {
        $set: payload,
        $setOnInsert: {
          cpfCnpj: "00000000000",
          address: {
            street: "Não informado",
            number: "S/N",
            district: "Não informado",
            city: "Não informado",
            state: "NA",
            zipCode: "00000000",
            complement: ""
          }
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
}
