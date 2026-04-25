import { InferSchemaType, Schema, Types, model } from "mongoose";

export const orderStatusSchema = ["pending", "paid", "cancelled"] as const;
export type OrderStatus = (typeof orderStatusSchema)[number];

const orderItemSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    customerId: { type: Types.ObjectId, ref: "Customer", required: true },
    quoteId: { type: Types.ObjectId, ref: "Quote" },
    items: { type: [orderItemSchema], required: true },
    status: { type: String, enum: orderStatusSchema, required: true, default: "pending" },
    logisticStatus: {
      type: String,
      enum: ["open", "production", "delivered"],
      required: true,
      default: "open"
    },
    total: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type OrderDocument = InferSchemaType<typeof orderSchema> & { _id: string };
export const OrderModel = model("Order", orderSchema);
