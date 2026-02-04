import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import * as MarzbanService from "../services/MarzbanService";
import { handleControllerError } from "../utils/handleError";
import { normalizeParamValue } from "../utils/validation";

class MarzbanController {
  static Login: RequestHandler = async (req, res, next) => {
    try {
      const result = await MarzbanService.login(req.body?.username, req.body?.password);
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static GetAccounts: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const sellerParam = normalizeParamValue(req.params.seller);
      const isAllParam = normalizeParamValue(req.params.isall);
      const result = await MarzbanService.getAccounts({
        authReq,
        sellerParam,
        isAllParam,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const sellerParam = normalizeParamValue(req.params.seller);
      const search = normalizeParamValue(req.params.search) ?? "";
      const result = await MarzbanService.getAccount({
        authReq,
        sellerParam,
        search,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const result = await MarzbanService.addAccount({
        authReq,
        body: req.body,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static EditAccount: RequestHandler = async (req, res, next) => {
    try {
      const username = normalizeParamValue(req.params.username) ?? "";
      const result = await MarzbanService.editAccount({
        authReq: req as AuthenticatedRequest,
        username,
        status: req.body?.status,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static DisableAccount: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const username = normalizeParamValue(req.params.username) ?? "";
      const result = await MarzbanService.disableAccount({
        authReq,
        username,
        status: req.body?.status,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RenewAccount: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const paramsSeller = normalizeParamValue(req.params.seller);
      const result = await MarzbanService.renewAccount({
        authReq,
        body: req.body,
        paramsSeller,
        authorization: req.headers.authorization,
      });
      res.status(200).json(result);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RemoveAccount: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const username = normalizeParamValue(req.params.username) ?? "";
      await MarzbanService.removeAccount({
        authReq,
        username,
        authorization: req.headers.authorization,
      });
      res.status(200).json({ message: "Delete Success!" });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  static RevokeSub: RequestHandler = async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;

    try {
      const username = normalizeParamValue(req.params.username) ?? "";
      await MarzbanService.revokeSub({
        authReq,
        username,
        authorization: req.headers.authorization,
      });
      res.status(200).json({ message: "Revoke Success!" });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}

export default MarzbanController;
