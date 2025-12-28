import { Types } from "mongoose";

import { getModel } from "../db/MongooseModel";
import { withMainTransaction } from "../db/withTransaction";
import type { ITariffInbound } from "../models/TariffInbound";
import { TariffInboundSchema } from "../models/TariffInbound";
import { HttpError } from "../utils/HttpError";
import { isValidObjectId } from "../utils/validation";
import AccountHelpers from "./account/AccountHelpers";

export const getTariffInboundListByTariffId = async (
  tariffId: string,
  authorization?: string,
): Promise<
  {
    InboundTag: string;
    InboundType: string;
    TariffId: string;
  }[]
> => {
  if (!isValidObjectId(tariffId)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffInboundModel = await getModel<ITariffInbound>("TariffInbound", TariffInboundSchema);
  const tariffInbounds = await TariffInboundModel.find({
    TariffId: new Types.ObjectId(tariffId),
  });
  const tariffInboundTags = new Set(tariffInbounds.map((ts) => ts.InboundTag?.toString()));
  const allInbound = await AccountHelpers.GetInbounds(authorization);
  return [
    ...allInbound
      .filter((inbound) => tariffInboundTags.has(inbound.InboundTag.toString()))
      .map((inbound) => ({
        InboundTag: inbound.InboundTag,
        InboundType: inbound.InboundType,
        TariffId: tariffId,
      })),
    ...allInbound
      .filter((inbound) => !tariffInboundTags.has(inbound.InboundTag.toString()))
      .map((inbound) => ({
        InboundTag: inbound.InboundTag,
        InboundType: inbound.InboundType,
        TariffId: "",
      })),
  ];
};

export const assignTariffInbound = async (
  tariffId: string,
  inboundList: ITariffInbound[],
): Promise<ITariffInbound[]> => {
  if (!isValidObjectId(tariffId)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffInboundModel = await getModel<ITariffInbound>("TariffInbound", TariffInboundSchema);
  const newEntries = inboundList.map((inbound: ITariffInbound) => ({
    TariffId: new Types.ObjectId(tariffId),
    InboundTag: inbound.InboundTag,
    InboundType: inbound.InboundType,
  }));
  return withMainTransaction(async (session) => {
    await TariffInboundModel.deleteMany({ TariffId: new Types.ObjectId(tariffId) }, { session });
    return TariffInboundModel.insertMany(newEntries, { session });
  });
};
