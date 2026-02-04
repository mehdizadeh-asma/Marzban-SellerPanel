import type { RequestHandler } from "express";

import * as AccountService from "../services/AccountService";
import { HttpError } from "../utils/HttpError";
import { handleControllerError } from "../utils/handleError";
import { isValidObjectId, normalizeParamValue, parsePagination } from "../utils/validation";

class AccountController {
  static GetAccountList: RequestHandler = async (req, res, next) => {
    try {
      const query = req.query ?? {};
      const { page, limit } = parsePagination(query.page, query.limit);
      const result = await AccountService.getAccountList({ page, limit });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid account id");
      }
      const account = await AccountService.getAccountById(id);
      res.status(200).json(account);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    try {
      const { Username, TariffID, SellerID } = req.body as {
        Username: string | undefined;
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      const normalizedUsername = Username?.trim();
      if (!normalizedUsername || !isValidObjectId(TariffID) || !isValidObjectId(SellerID)) {
        throw new HttpError(400, "Username, TariffID, and SellerID are required and must be valid");
      }
      const result = await AccountService.addAccount({
        username: normalizedUsername,
        tariffId: TariffID,
        sellerId: SellerID,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RemoveAccount: RequestHandler = async (req, res, next) => {
    try {
      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid account id");
      }
      const result = await AccountService.removeAccount(id);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static PayAccounts: RequestHandler = async (req, res, next) => {
    try {
      const { accountIds, payed } = req.body as { accountIds?: string[]; payed?: boolean };

      if (!Array.isArray(accountIds) || accountIds.length === 0 || typeof payed !== "boolean") {
        throw new HttpError(400, "accountIds (array) and payed (boolean) are required");
      }
      if (accountIds.some((id) => !isValidObjectId(id))) {
        throw new HttpError(400, "Invalid accountIds");
      }
      await AccountService.payAccounts({ accountIds, payed });
      res.status(200).json("Payments updated successfully!");
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static PayAccount: RequestHandler = async (req, res, next) => {
    try {
      const { payed } = req.body as { payed?: boolean };
      if (typeof payed !== "boolean") {
        throw new HttpError(400, "payed (boolean) is required");
      }

      const id = normalizeParamValue(req.params.id);
      if (!isValidObjectId(id)) {
        throw new HttpError(400, "Invalid account id");
      }
      const result = await AccountService.payAccount(id, payed);
      res.status(200).json({ message: "Payment updated!", account: result });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
export default AccountController;
