import { ProductModel } from "../product/product.model";

export class InventoryService {
  async reserve(productId: string, quantity: number) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }
    const available = product.stock - product.reservedStock;
    if (available < quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}`);
    }
    product.reservedStock += quantity;
    await product.save();
    return product;
  }

  async release(productId: string, quantity: number) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }
    product.reservedStock = Math.max(0, product.reservedStock - quantity);
    await product.save();
    return product;
  }

  async confirmDebit(productId: string, quantity: number) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error("Produto não encontrado");
    }
    if (product.reservedStock < quantity || product.stock < quantity) {
      throw new Error(`Estoque inconsistente para ${product.name}`);
    }
    product.stock -= quantity;
    product.reservedStock -= quantity;
    await product.save();
    return product;
  }

  async list() {
    return ProductModel.find().select("name stock reservedStock salePrice").sort({ name: 1 });
  }

  async setStock(productId: string, stock: number) {
    const product = await ProductModel.findById(productId);
    if (!product) {
      return null;
    }
    if (stock < product.reservedStock) {
      throw new Error("Estoque não pode ficar abaixo do estoque reservado");
    }
    product.stock = stock;
    await product.save();
    return product;
  }
}
