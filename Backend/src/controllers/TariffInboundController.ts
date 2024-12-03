import { RequestHandler } from "express";
import { Types } from "mongoose";

import TariffInbound, { ITariffInbound } from "../models/TariffInbound";
import Tariff from "../models/Tariff";
import { title } from "process";
import AccountHelpers from "../utils/AccountHelpers";

class TariffInboundController {
  // static GetTariffInboundListByTariffId: RequestHandler = async (
  //   req,
  //   res,
  //   next
  // ) => {
  //   try {
  //     const tariffId: string = req.params.tariffId;
  //     console.log("tariffId", tariffId);
  //     const tariffInbounds = await TariffInbound.find({
  //       TariffId: new Types.ObjectId(tariffId),
  //     });
  //     console.log("tariffInbounds", tariffInbounds);

  //     const tariffInboundIds = new Set(
  //       tariffInbounds.map((ts) => ts.TariffId.toString())
  //     );
  //     // const allTariffs = await Tariff.find();
  //     const allInbound = await AccountHelpers.GetInbounds(
  //       req.headers.authorization
  //     );

  //     // console.log("allInbound", allInbound);
  //     // Transform the data into the desired format
  //     const formattedInbounds = Object.entries(allInbound).flatMap(
  //       ([inboundType, inboundTags]) => {
  //         // If inboundTags is undefined or empty, return an empty array
  //         if (!inboundTags || inboundTags.length === 0) {
  //           return [];
  //         }

  //         // Map each inboundTag into an object with InboundType and InboundTag
  //         return inboundTags.map((inboundTag) => ({
  //           InboundType: inboundType,
  //           InboundTag: inboundTag,
  //         }));
  //       }
  //     );
  //     console.log("formattedInbounds", formattedInbounds);
  //     const FinalList = [
  //       // Add inbounds that are already assigned (present in tariffInboundIds)
  //       ...formattedInbounds
  //         .filter((inbound) =>
  //           tariffInboundIds.has(inbound.InboundTag.toString())
  //         )
  //         .map((inbound) => ({
  //           InboundTag: inbound.InboundTag,
  //           InboundType: inbound.InboundType, // Fix case to match key in formattedInbounds
  //           TariffId: tariffId, // Mark as assigned to the current TariffId
  //         })),

  //       // Add inbounds that are not assigned (not in tariffInboundIds)
  //       ...formattedInbounds
  //         .filter(
  //           (inbound) => !tariffInboundIds.has(inbound.InboundTag.toString())
  //         )
  //         .map((inbound) => ({
  //           InboundTag: inbound.InboundTag,
  //           InboundType: inbound.InboundType, // Fix case to match key in formattedInbounds
  //           TariffId: "", // Mark as unassigned
  //         })),
  //     ];
  //     // console.log("FinalList", FinalList);
  //     res.status(200).json(FinalList);
  //   } catch (error) {
  //     next(error);
  //   }
  // };
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

      console.log("Querying tariffId:", tariffId);

      const tariffInbounds = await TariffInbound.find({
        TariffId: new Types.ObjectId(tariffId),
      });

      console.log("Fetched tariffInbounds:", tariffInbounds);

      const tariffInboundTags = new Set(
        tariffInbounds.map((ts) => ts.InboundTag?.toString())
      );

      console.log("Set of TariffInbound Tags:", tariffInboundTags);

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

      console.log("Formatted inbounds:", formattedInbounds);

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

      console.log("Final list of inbounds :", FinalList);

      res.status(200).json(FinalList);
    } catch (error) {
      console.error("Error in GetTariffInb oundListByTariffId:", error);
      next(error);
    }
  };

  static AssignTariffInbound: RequestHandler = async (req, res, next) => {
    try {
      const tariffId = req.params.tariffid;
      const { InboundList }: { InboundList: ITariffInbound[] } = req.body;
      console.log("new Inbounds in assign", InboundList, tariffId);
      await TariffInbound.deleteMany({
        TariffId: new Types.ObjectId(tariffId),
      });

      const newEntries = InboundList.map((inbound: ITariffInbound) => ({
        TariffId: new Types.ObjectId(tariffId),
        InboundTag: inbound.InboundTag,
        InboundType: inbound.InboundType,
      }));
      console.log("new entries", newEntries);
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
