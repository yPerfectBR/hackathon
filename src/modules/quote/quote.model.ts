import { InferSchemaType, Schema, Types, model } from "mongoose";

const quoteItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const quoteSchema = new Schema(
  {
    customerId: { type: Types.ObjectId, ref: "Customer", required: true },
    items: { type: [quoteItemSchema], required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "approved", "rejected", "converted"],
      default: "draft",
      required: true
    },
    total: { type: Number, required: true, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

export type QuoteDocument = InferSchemaType<typeof quoteSchema> & { _id: string };
export const QuoteModel = model("Quote", quoteSchema);
