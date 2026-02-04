import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import * as TariffService from "../services/TariffService";
import { HttpError } from "../utils/HttpError";
import { handleControllerError } from "../utils/handleError";
import { isValidObjectId, normalizeParamValue } from "../utils/validation";

class TariffController {
  static GetTariffList: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const isAllParam = normalizeParamValue(req.params.isall);
      const titleParam = normalizeParamValue(req.params.title);
      const result = await TariffService.getTariffList({
        user: authReq.user,
        isAll: isAllParam === "true",
        title: titleParam,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static GetTariff: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid Tariff Id");
      }
      const tariff = await TariffService.getTariffById(id);
      res.status(200).json(tariff);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static AddTariff: RequestHandler = async (req, res, next) => {
    try {
      const { Title, DataLimit, Duration, Price, IsFree, IsVisible } = req.body as {
        Title: string | undefined;
        DataLimit: number | string | undefined;
        Duration: number | string | undefined;
        Price: number | string | undefined;
        IsFree: boolean | undefined;
        IsVisible: boolean | undefined;
      };
      const normalizedTitle = Title?.trim();
      const dataLimitValue = Number(DataLimit);
      const durationValue = Number(Duration);
      const priceValue = Number(Price);
      if (
        !normalizedTitle ||
        !Number.isFinite(dataLimitValue) ||
        !Number.isFinite(durationValue) ||
        !Number.isFinite(priceValue) ||
        dataLimitValue < 0 ||
        durationValue < 0 ||
        priceValue < 0 ||
        (IsFree !== undefined && typeof IsFree !== "boolean") ||
        (IsVisible !== undefined && typeof IsVisible !== "boolean")
      ) {
        throw new HttpError(400, "Invalid tariff payload");
      }
      const result = await TariffService.addTariff({
        title: normalizedTitle,
        dataLimit: dataLimitValue,
        duration: durationValue,
        price: priceValue,
        isFree: IsFree,
        isVisible: IsVisible,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static EditTariff: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid Tariff Id");
      }
      const { Title, DataLimit, Duration, Price, IsFree, IsVisible } = req.body as {
        Title?: string;
        DataLimit?: number | string;
        Duration?: number | string;
        Price?: number | string;
        IsFree?: boolean;
        IsVisible?: boolean;
      };
      const normalizedTitle = Title?.trim();
      const dataLimitValue = DataLimit !== undefined ? Number(DataLimit) : undefined;
      const durationValue = Duration !== undefined ? Number(Duration) : undefined;
      const priceValue = Price !== undefined ? Number(Price) : undefined;

      if (
        (dataLimitValue !== undefined &&
          (!Number.isFinite(dataLimitValue) || dataLimitValue < 0)) ||
        (durationValue !== undefined && (!Number.isFinite(durationValue) || durationValue < 0)) ||
        (priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0)) ||
        (IsFree !== undefined && typeof IsFree !== "boolean") ||
        (IsVisible !== undefined && typeof IsVisible !== "boolean")
      ) {
        throw new HttpError(400, "Invalid tariff payload");
      }

      const tariff = await TariffService.editTariff(id, {
        title: normalizedTitle,
        dataLimit: dataLimitValue,
        duration: durationValue,
        price: priceValue,
        isFree: IsFree,
        isVisible: IsVisible,
      });
      res.status(200).json(tariff);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RemoveTariff: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid Tariff Id");
      }
      await TariffService.removeTariff(id);
      res.status(200).json({ deletedCount: 1 });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static DisableTariff: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid Tariff Id");
      }
      const isVisible = await TariffService.toggleTariffVisibility(id);
      res.status(200).json({ result: "Tariff Changed!", IsVisible: isVisible });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static FreeChanged: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid Tariff Id");
      }
      const isFree = await TariffService.toggleTariffFree(id);
      res.status(200).json({ result: "Tariff Changed!", IsFree: isFree });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
export default TariffController;
