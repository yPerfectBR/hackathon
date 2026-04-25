import { InferSchemaType, Schema, model } from "mongoose";

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    whatsapp: { type: String, required: true, trim: true, unique: true },
    cpfCnpj: { type: String, required: true, trim: true },
    address: {
      street: { type: String, required: true, trim: true },
      number: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      complement: { type: String, trim: true, default: "" }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export type CustomerDocument = InferSchemaType<typeof customerSchema> & { _id: string };
export const CustomerModel = model("Customer", customerSchema);
