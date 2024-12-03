import mongoose, { Document, Schema } from "mongoose";
import { ITariff } from "./Tariff";
import { ISeller } from "./Seller";

export interface ITariffSeller extends Document {
  TariffId: mongoose.Types.ObjectId | ITariff;
  SellerId: mongoose.Types.ObjectId | ISeller;
  Status: "Active" | "Deactive";
}

export const TariffSellerSchema: Schema = new Schema({
  TariffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Tariff is required"],
    ref: "Tariff",
    index: true,
  },
  SellerId: {
    type: mongoose.Schema.Types.ObjectId,
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

const TariffSeller = mongoose.model<ITariffSeller>(
  "TariffSeller",
  TariffSellerSchema
);
export default TariffSeller;
