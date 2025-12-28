import type { RequestHandler } from "express";

import type { ITariffInbound } from "../models/TariffInbound";
import * as TariffInboundService from "../services/TariffInboundService";
import { HttpError } from "../utils/HttpError";
import { handleControllerError } from "../utils/handleError";
import { isValidObjectId } from "../utils/validation";

class TariffInboundController {
  static GetTariffInboundListByTariffId: RequestHandler = async (req, res, next) => {
    try {
      const tariffId: string = req.params.tariffId;
      if (!isValidObjectId(tariffId)) {
        throw new HttpError(400, "Invalid tariffId");
      }
      const result = await TariffInboundService.getTariffInboundListByTariffId(
        tariffId,
        req.headers.authorization,
      );
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static AssignTariffInbound: RequestHandler = async (req, res, next) => {
    try {
      const tariffId = req.params.tariffId ?? req.params.tariffid;
      if (!isValidObjectId(tariffId)) {
        throw new HttpError(400, "Invalid tariffId");
      }
      const InboundList = req.body as ITariffInbound[];
      if (!Array.isArray(InboundList)) {
        throw new HttpError(400, "Inbound list must be an array");
      }
      if (
        InboundList.some(
          (inbound) =>
            typeof inbound?.InboundTag !== "string" || typeof inbound?.InboundType !== "string",
        )
      ) {
        throw new HttpError(400, "Inbound items must include InboundTag and InboundType");
      }
      const result = await TariffInboundService.assignTariffInbound(tariffId, InboundList);
      res.status(200).json({
        message: "Inbounds successfully assigned to Package.",
        result,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
export default TariffInboundController;
