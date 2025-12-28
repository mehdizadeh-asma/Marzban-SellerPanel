import type { HydratedDocument, PopulatedDoc } from "mongoose";
import { Schema, Types } from "mongoose";

import type { ISeller } from "./Seller";
import type { ITariff } from "./Tariff";

export interface IAccount {
  _id: Types.ObjectId;
  Username: string;
  Tariff: string;
  TariffId: PopulatedDoc<ITariff>;
  Seller: PopulatedDoc<ISeller>;
  Payed: boolean;
}

export type AccountDocument = HydratedDocument<IAccount>;

export const AccountSchema = new Schema<IAccount>({
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
