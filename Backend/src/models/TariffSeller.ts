import { Document, Types, Schema } from "mongoose";
import { ITariff } from "./Tariff";
import { ISeller } from "./Seller";

export interface ITariffSeller extends Document {
  _id: Types.ObjectId;
  TariffId: Types.ObjectId | ITariff;
  SellerId: Types.ObjectId | ISeller;
  Status: "Active" | "Deactive";
}

export const TariffSellerSchema: Schema = new Schema({
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
