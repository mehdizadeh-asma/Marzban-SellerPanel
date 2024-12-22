import mongoose, { Document, Types, Schema } from "mongoose";
import { ISeller } from "./Seller";
import { ITariff } from "./Tariff";

export interface IAccount extends Document {
  _id: Types.ObjectId;
  Username: string;
  Tariff: string;
  TariffId: Types.ObjectId | ITariff;
  Seller: Types.ObjectId | ISeller;
  Payed: boolean;
}

export const AccountSchema: Schema = new Schema({
  Username: {
    type: String,
    required: [true, "Username is required"],
    index: true,
  },
  Tariff: { type: String, required: [true, "Tariff is required"] },
  TariffId: {
    type: Types.ObjectId,
    required: [true, "Tariff Document is required"],
    ref: "Tariff",
    index: true,
  },
  Seller: {
    type: Types.ObjectId,
    ref: "Seller",
    required: [true, "Seller Document is required"],
    index: true,
  },
  Payed: { type: Boolean, default: false },
});

const Account = mongoose.model<IAccount>("Account", AccountSchema);
export default Account;
