import { InferSchemaType, Schema, Types, model } from "mongoose";

const purchaseItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    items: { type: [purchaseItemSchema], required: true },
    total: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type PurchaseDocument = InferSchemaType<typeof purchaseSchema> & { _id: string };
export const PurchaseModel = model("Purchase", purchaseSchema);
