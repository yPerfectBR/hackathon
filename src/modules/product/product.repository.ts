import { ProductModel } from "./product.model";

export class ProductRepository {
  async create(data: Record<string, unknown>) {
    return ProductModel.create(data);
  }

  async findPaginated(skip: number, limit: number) {
    const [items, total] = await Promise.all([
      ProductModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ProductModel.countDocuments()
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return ProductModel.findById(id);
  }

  async searchByName(name: string) {
    return ProductModel.find({
      name: { $regex: name, $options: "i" }
    }).limit(20);
  }

  async updateById(id: string, data: Record<string, unknown>) {
    return ProductModel.findByIdAndUpdate(id, data, { returnDocument: "after" });
  }

  async deleteById(id: string) {
    return ProductModel.findByIdAndDelete(id);
  }

  async listInventory() {
    return ProductModel.find().select("name stock reservedStock salePrice").sort({ name: 1 });
  }
}
