import type { RequestHandler } from "express";
import * as SellerService from "../services/SellerService";
import { HttpError } from "../utils/HttpError";
import { handleControllerError } from "../utils/handleError";
import { isValidObjectId, normalizeParamValue, parsePagination } from "../utils/validation";

class SellerController {
  static GetSellerList: RequestHandler = async (req, res, next) => {
    try {
      const query = req.query ?? {};
      const { page, limit } = parsePagination(query.page, query.limit);
      const result = await SellerService.getSellerList({ page, limit });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static GetSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid seller id");
      }
      const result = await SellerService.getSellerById(id);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static AddSeller: RequestHandler = async (req, res, next) => {
    try {
      const { Title, Limit, Username, Password, MarzbanUsername, MarzbanPassword } = req.body as {
        Title: string | undefined;
        Limit: string | number;
        Username: string | undefined;
        Password: string | undefined;
        MarzbanUsername: string | undefined;
        MarzbanPassword: string | undefined;
      };
      const normalizedTitle = Title?.trim();
      const normalizedUsername = Username?.trim();
      const normalizedPassword = Password?.trim();
      const normalizedMarzbanUsername = MarzbanUsername?.trim();
      const normalizedMarzbanPassword = MarzbanPassword?.trim();
      const limitValue = Number(Limit);

      if (
        !normalizedTitle ||
        !normalizedUsername ||
        !normalizedPassword ||
        !normalizedMarzbanUsername ||
        !normalizedMarzbanPassword ||
        !Number.isFinite(limitValue) ||
        limitValue < 0
      ) {
        throw new HttpError(400, "Required seller fields are missing or invalid");
      }
      const result = await SellerService.addSeller({
        title: normalizedTitle,
        limit: limitValue,
        username: normalizedUsername,
        password: normalizedPassword,
        marzbanUsername: normalizedMarzbanUsername,
        marzbanPassword: normalizedMarzbanPassword,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static EditSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid seller id");
      }
      const { Title, Limit, Username, Password, MarzbanUsername, MarzbanPassword } = req.body as {
        Title?: string;
        Limit?: number | string;
        Username?: string;
        Password?: string;
        MarzbanUsername?: string;
        MarzbanPassword?: string;
      };
      const normalizedMarzbanUsername = MarzbanUsername?.trim();
      const normalizedMarzbanPassword = MarzbanPassword?.trim();
      if (!normalizedMarzbanUsername || !normalizedMarzbanPassword) {
        throw new HttpError(400, "Marzban credentials are required");
      }
      const normalizedTitle = Title?.trim();
      const normalizedUsername = Username?.trim();
      const normalizedPassword = Password?.trim();
      const limitValue = Limit !== undefined ? Number(Limit) : undefined;
      if (limitValue !== undefined && (!Number.isFinite(limitValue) || limitValue < 0)) {
        throw new HttpError(400, "Limit must be a valid number");
      }
      const updatedSeller = await SellerService.editSeller(id, {
        title: normalizedTitle,
        limit: limitValue,
        username: normalizedUsername,
        password: normalizedPassword,
        marzbanUsername: normalizedMarzbanUsername,
        marzbanPassword: normalizedMarzbanPassword,
      });
      res.status(200).json({
        message: "Seller updated successfully",
        seller: updatedSeller,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RemoveSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid seller id");
      }
      const result = await SellerService.removeSeller(id);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static DisableSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid seller id");
      }
      const status = await SellerService.toggleSellerStatus(id);
      res.status(200).json({ result: "Seller Changed!", status });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
export default SellerController;
