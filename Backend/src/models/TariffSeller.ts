import type { HydratedDocument, PopulatedDoc } from "mongoose";
import { Schema, Types } from "mongoose";

import type { ISeller } from "./Seller";
import type { ITariff } from "./Tariff";

export interface ITariffSeller {
  _id: Types.ObjectId;
  TariffId: PopulatedDoc<ITariff>;
  SellerId: PopulatedDoc<ISeller>;
  Status: "Active" | "Deactive";
}

export type TariffSellerDocument = HydratedDocument<ITariffSeller>;

export const TariffSellerSchema = new Schema<ITariffSeller>({
  TariffId: {
    type: Types.ObjectId,
    required: [true, "Tariff is required"],
    ref: "Tariff",
    index: true,
  },
  SellerId: {
    type: Types.ObjectId,
    ref: "Seller",
    required: [true, "Seller is required"],
    index: true,
  },
  Status: {
    type: String,
    enum: {
      values: ["Active", "Deactive"],
      message: "{VALUE} is not supported",
    },
    default: "Active",
  },
});
