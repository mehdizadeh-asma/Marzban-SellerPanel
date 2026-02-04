import type { RequestHandler } from "express";

import * as TariffSellerService from "../services/TariffSellerService";
import { HttpError } from "../utils/HttpError";
import { handleControllerError } from "../utils/handleError";
import { isValidObjectId, normalizeParamValue } from "../utils/validation";

class TariffSellerController {
  static GetTariffSellerListBySellerId: RequestHandler = async (req, res, next) => {
    try {
      const sellerId = normalizeParamValue(req.params.sellerId);
      if (!isValidObjectId(sellerId)) {
        throw new HttpError(400, "Invalid sellerId");
      }
      const visibleOnly = String(req.query?.visibleOnly ?? "").toLowerCase() === "true";
      const result = await TariffSellerService.getTariffSellerListBySellerId(sellerId, visibleOnly);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
  static GetTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid tariff seller id");
      }
      const tariffSeller = await TariffSellerService.getTariffSeller(id);
      res.status(200).json(tariffSeller);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
  static AddTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const { TariffID, SellerID } = req.body as {
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      if (!isValidObjectId(TariffID) || !isValidObjectId(SellerID)) {
        throw new HttpError(400, "TariffID and SellerID are required and must be valid");
      }
      const result = await TariffSellerService.addTariffSeller(TariffID, SellerID);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
  static AssignTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const rawSellerId = req.params.sellerId ?? req.params.sellerid;
      const sellerId = normalizeParamValue(rawSellerId);
      if (!isValidObjectId(sellerId)) {
        throw new HttpError(400, "Invalid sellerId");
      }
      const tariffIds = (req.body as { TariffIds: string[] }).TariffIds;
      if (!Array.isArray(tariffIds)) {
        throw new HttpError(400, "TariffIds must be an array");
      }
      if (tariffIds.some((tariffId) => !isValidObjectId(tariffId))) {
        throw new HttpError(400, "TariffIds contain invalid entries");
      }
      const result = await TariffSellerService.assignTariffSeller(sellerId, tariffIds);
      res.status(200).json({
        message: "Tariffs successfully assigned to seller.",
        result,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
  static RemoveTariffSellerBySellerId: RequestHandler = async (req, res, next) => {
    try {
      const rawSellerId = req.params.sellerId ?? req.params.sellerid;
      const id = normalizeParamValue(rawSellerId);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid sellerId");
      }
      await TariffSellerService.removeTariffSellerBySellerId(id);
      res.status(200).json({ deletedCount: 1 });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
  static ChangeStatusTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid tariff seller id");
      }
      const status = await TariffSellerService.toggleTariffSellerStatus(id);
      res.status(200).json({
        result: `The Status Changed To${status} Successfully!`,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
export default TariffSellerController;
