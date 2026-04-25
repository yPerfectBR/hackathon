import { InferSchemaType, Schema, Types, model } from "mongoose";

const paymentSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: "Order", required: true, unique: true },
    status: { type: String, enum: ["paid"], required: true },
    transactionId: { type: String, required: true, unique: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & { _id: string };
export const PaymentModel = model("Payment", paymentSchema);
