import { RequestHandler } from "express";
import { Types } from "mongoose";

import TariffInbound, { ITariffInbound } from "../models/TariffInbound";
import AccountHelpers from "../utils/AccountHelpers";

class TariffInboundController {
  static GetTariffInboundListByTariffId: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const tariffId: string = req.params.tariffId;

      if (!Types.ObjectId.isValid(tariffId)) {
        return res.status(400).json({ error: "Invalid TariffId format." });
      }

      const tariffInbounds = await TariffInbound.find({
        TariffId: new Types.ObjectId(tariffId),
      });

      const tariffInboundTags = new Set(
        tariffInbounds.map((ts) => ts.InboundTag?.toString())
      );

      const allInbound = await AccountHelpers.GetInbounds(
        req.headers.authorization
      );

      const formattedInbounds = Object.entries(allInbound).flatMap(
        ([inboundType, inboundTags]) => {
          if (!inboundTags || inboundTags.length === 0) {
            return [];
          }
          return inboundTags.map((inboundTag) => ({
            InboundType: inboundType,
            InboundTag: inboundTag,
          }));
        }
      );

      const FinalList = [
        ...formattedInbounds
          .filter((inbound) =>
            tariffInboundTags.has(inbound.InboundTag.toString())
          )
          .map((inbound) => ({
            InboundTag: inbound.InboundTag,
            InboundType: inbound.InboundType,
            TariffId: tariffId,
          })),
        ...formattedInbounds
          .filter(
            (inbound) => !tariffInboundTags.has(inbound.InboundTag.toString())
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
      const tariffId = req.params.tariffid;
      const InboundList = req.body as ITariffInbound[];
      await TariffInbound.deleteMany({
        TariffId: new Types.ObjectId(tariffId),
      });

      const newEntries = InboundList.map((inbound: ITariffInbound) => ({
        TariffId: new Types.ObjectId(tariffId),
        InboundTag: inbound.InboundTag,
        InboundType: inbound.InboundType,
      }));
      const result = await TariffInbound.insertMany(newEntries);

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
