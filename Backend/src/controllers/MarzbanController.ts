import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import * as MarzbanService from "../services/MarzbanService";
import { handleControllerError } from "../utils/handleError";

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
      const result = await MarzbanService.getAccounts({
        authReq,
        sellerParam: req.params.seller,
        isAllParam: req.params.isall,
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
      const result = await MarzbanService.getAccount({
        authReq,
        sellerParam: req.params.seller,
        search: req.params.search,
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
      const result = await MarzbanService.editAccount({
        authReq: req as AuthenticatedRequest,
        username: req.params.username,
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
      const result = await MarzbanService.disableAccount({
        authReq,
        username: req.params.username,
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
      const result = await MarzbanService.renewAccount({
        authReq,
        body: req.body,
        paramsSeller: req.params.seller,
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
      await MarzbanService.removeAccount({
        authReq,
        username: req.params.username,
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
      await MarzbanService.revokeSub({
        authReq,
        username: req.params.username,
        authorization: req.headers.authorization,
      });
      res.status(200).json({ message: "Revoke Success!" });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}

export default MarzbanController;
