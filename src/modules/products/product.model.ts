import { InferSchemaType, Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type ProductDocument = InferSchemaType<typeof productSchema> & { _id: string };
export const ProductModel = model("Product", productSchema);
