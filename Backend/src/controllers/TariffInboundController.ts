import type { RequestHandler } from "express";
import { Types } from "mongoose";

import type { ITariffInbound } from "../models/TariffInbound";
import { TariffInboundSchema } from "../models/TariffInbound";
import AccountHelpers from "../utils/AccountHelpers";
import { getModel } from "../utils/MongooseModel";

class TariffInboundController {
  static GetTariffInboundListByTariffId: RequestHandler = async (
    req,
    res,
    next,
  ) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffInboundModel = await getModel<ITariffInbound>(
        "TariffInbound",
        TariffInboundSchema,
      );
      const tariffId: string = req.params.tariffId;
      const tariffInbounds = await TariffInboundModel.find({
        TariffId: new Types.ObjectId(tariffId),
      });
      const tariffInboundTags = new Set(
        tariffInbounds.map((ts) => ts.InboundTag?.toString()),
      );
      const allInbound = await AccountHelpers.GetInbounds(
        req.headers.authorization,
      );
      const FinalList = [
        ...allInbound
          .filter((inbound) =>
            tariffInboundTags.has(inbound.InboundTag.toString()),
          )
          .map((inbound) => ({
            InboundTag: inbound.InboundTag,
            InboundType: inbound.InboundType,
            TariffId: tariffId,
          })),
        ...allInbound
          .filter(
            (inbound) => !tariffInboundTags.has(inbound.InboundTag.toString()),
          )
          .map((inbound) => ({
            InboundTag: inbound.InboundTag,
            InboundType: inbound.InboundType,
            TariffId: "",
          })),
      ];
      res.status(200).json(FinalList);
    } catch (error) {
      next(error);
    }
  };

  static AssignTariffInbound: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffInboundModel = await getModel<ITariffInbound>(
        "TariffInbound",
        TariffInboundSchema,
      );
      const tariffId = req.params.tariffid;
      const InboundList = req.body as ITariffInbound[];
      await TariffInboundModel.deleteMany({
        TariffId: new Types.ObjectId(tariffId),
      });
      const newEntries = InboundList.map((inbound: ITariffInbound) => ({
        TariffId: new Types.ObjectId(tariffId),
        InboundTag: inbound.InboundTag,
        InboundType: inbound.InboundType,
      }));
      const result = await TariffInboundModel.insertMany(newEntries);
      res.status(200).json({
        message: "Inbounds successfully assigned to Package.",
        result,
      });
    } catch (error) {
      next(error);
    }
  };
}
export default TariffInboundController;
