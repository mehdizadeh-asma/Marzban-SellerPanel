import type { HydratedDocument, PopulatedDoc } from "mongoose";
import { Schema, Types } from "mongoose";

import type { ITariff } from "./Tariff";

export interface ITariffInbound {
  _id: Types.ObjectId;
  TariffId: PopulatedDoc<ITariff>;
  InboundTag: string;
  InboundType: "vmess" | "vless" | "trojan" | "shadowsocks";
  Status: "Active" | "Deactive";
}

export type TariffInboundDocument = HydratedDocument<ITariffInbound>;

export const TariffInboundSchema = new Schema<ITariffInbound>({
  TariffId: {
    type: Types.ObjectId,
    required: [true, "Tariff is required"],
    ref: "Tariff",
    index: true,
  },
  InboundTag: { type: String, required: [true, "InboundTag is required"] },
  InboundType: {
    type: String,
    enum: {
      values: ["vmess", "vless", "trojan", "shadowsocks"],
      message: "{VALUE} is not supported",
    },
    default: "vmess",
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
