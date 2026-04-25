import { ProductRepository } from "./product.repository";

const FALLBACK_IMAGE = "https://placehold.co/600x400?text=Produto";

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async create(payload: {
    name: string;
    basicDescription: string;
    fullDescription: string;
    imageUrl?: string;
    salePrice: number;
    productionCost: number;
    stock: number;
    isFeatured?: boolean;
  }) {
    return this.repository.create({
      ...payload,
      imageUrl: payload.imageUrl ?? FALLBACK_IMAGE
    });
  }

  async findPaginated(skip: number, limit: number) {
    return this.repository.findPaginated(skip, limit);
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async searchByName(name: string) {
    return this.repository.searchByName(name);
  }

  async updateById(id: string, payload: Record<string, unknown>) {
    const enrichedPayload = { ...payload };
    if (typeof payload.imageUrl === "undefined") {
      delete enrichedPayload.imageUrl;
    }
    return this.repository.updateById(id, enrichedPayload);
  }

  async deleteById(id: string) {
    return this.repository.deleteById(id);
  }

  async listInventory() {
    return this.repository.listInventory();
  }
}
