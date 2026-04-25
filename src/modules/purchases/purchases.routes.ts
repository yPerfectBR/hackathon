import { FastifyPluginAsync } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { ProductModel } from "../products/product.model";
import { PurchaseModel } from "./purchase.model";
import { UserModel } from "../users/user.model";

const createPurchaseSchema = z.object({
  userId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1)
    })
  ).min(1)
});

export const purchasesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    const payload = createPurchaseSchema.parse(request.body);

    if (!Types.ObjectId.isValid(payload.userId)) {
      return reply.badRequest("ID de usuário inválido");
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return reply.notFound("Usuário não encontrado");
    }

    const purchaseItems: Array<{
      productId: Types.ObjectId;
      name: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }> = [];

    for (const item of payload.items) {
      if (!Types.ObjectId.isValid(item.productId)) {
        return reply.badRequest("ID de produto inválido");
      }

      const product = await ProductModel.findById(item.productId);
      if (!product) {
        return reply.notFound(`Produto ${item.productId} não encontrado`);
      }

      if (product.stock < item.quantity) {
        return reply.badRequest(`Estoque insuficiente para ${product.name}`);
      }

      const total = product.price * item.quantity;
      purchaseItems.push({
        productId: product._id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        total
      });
    }

    const purchaseTotal = purchaseItems.reduce((acc, item) => acc + item.total, 0);
    if (user.money < purchaseTotal) {
      return reply.badRequest("Saldo insuficiente");
    }

    for (const item of purchaseItems) {
      await ProductModel.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    for (const item of purchaseItems) {
      const existingItem = user.inventory.find(
        (inventoryItem) => inventoryItem.productId.toString() === item.productId.toString()
      );
      if (existingItem) {
        existingItem.quantity = existingItem.quantity + item.quantity;
      } else {
        user.inventory.push({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity
        });
      }
    }

    user.money = user.money - purchaseTotal;
    await user.save();

    const purchase = await PurchaseModel.create({
      userId: user._id,
      items: purchaseItems,
      total: purchaseTotal
    });

    return reply.code(201).send(purchase);
  });

  app.get("/", async () => PurchaseModel.find().sort({ createdAt: -1 }));
};
