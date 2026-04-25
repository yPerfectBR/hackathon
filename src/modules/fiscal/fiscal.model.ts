import { InferSchemaType, Schema, Types, model } from "mongoose";

const fiscalSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: "Order", required: true, unique: true },
    accessKey: { type: String, required: true, trim: true },
    xmlPath: { type: String, required: true, trim: true },
    pdfPath: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "issued", "cancelled"], required: true, default: "pending" }
  },
  { timestamps: true, versionKey: false }
);

export type FiscalDocument = InferSchemaType<typeof fiscalSchema> & { _id: string };
export const FiscalModel = model("Fiscal", fiscalSchema);
