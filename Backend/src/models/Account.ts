import mongoose, { Document, Schema } from "mongoose";
import { ISeller } from "./Seller";
import { ITariff } from "./Tariff";

export interface IAccount extends Document {
  Username: string;
  Tariff: string;
  TariffId: mongoose.Types.ObjectId | ITariff;
  Seller: mongoose.Types.ObjectId | ISeller;
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
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Tariff is required"],
    ref: "Tariff",
    index: true,
  },
  Seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: [true, "Seller Document is required"],
    index: true,
  },
  Payed: { type: Boolean, default: false },
});

const Account = mongoose.model<IAccount>("Account", AccountSchema);
export default Account;
