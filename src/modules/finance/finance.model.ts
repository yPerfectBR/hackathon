import { InferSchemaType, Schema, Types, model } from "mongoose";

const financeSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: "Order", required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, default: "pix" },
    dueDate: { type: Date, required: true },
    transactionCode: { type: String, trim: true },
    status: { type: String, enum: ["pending", "paid", "overdue"], required: true, default: "pending" }
  },
  { timestamps: true, versionKey: false }
);

export type FinanceDocument = InferSchemaType<typeof financeSchema> & { _id: string };
export const FinanceModel = model("Finance", financeSchema);
