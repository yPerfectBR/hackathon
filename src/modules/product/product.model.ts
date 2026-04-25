import { InferSchemaType, Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    basicDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    salePrice: { type: Number, required: true, min: 0 },
    productionCost: { type: Number, required: true, min: 0 },
    ncm: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    isFeatured: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type ProductDocument = InferSchemaType<typeof productSchema> & { _id: string };
export const ProductModel = model("Product", productSchema);
