import mongoose, { Document, ObjectId, Schema } from "mongoose";
import { ITariff } from "./Tariff";

export interface ITariffInbound extends Document {
  _id: ObjectId;
  TariffId: ObjectId | ITariff;
  InboundTag: string;
  InboundType: "vmess" | "vless" | "trojan";
  Status: "Active" | "Deactive";
}

export const TariffInboundSchema: Schema = new Schema({
  TariffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Tariff is required"],
    ref: "Tariff",
    index: true,
  },
  InboundTag: { type: String, required: [true, "InboundTag is required"] },
  InboundType: {
    type: String,
    enum: {
      values: ["vmess", "vless", "trojan"],
      message: "{VALUE} is not supported",
    },
    default: "Active",
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

const TariffInbound = mongoose.model<ITariffInbound>(
  "TariffInbound",
  TariffInboundSchema
);
export default TariffInbound;
