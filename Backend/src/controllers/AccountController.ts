import { RequestHandler } from "express";
import { Types } from "mongoose";

import Account from "../models/Account";
import Tariff from "../models/Tariff";

class AccountController {
  static GetAccountList: RequestHandler = async (req, res, next) => {
    try {
      const result = await Account.find();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    try {
      const id: string = req.params.id;

      const account = await Account.findOne({ _id: new Types.ObjectId(id) });

      if (!account) throw new Error("Account not found!");

      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    try {
      const { Username, TariffID, SellerID } = req.body as {
        Username: string | undefined;
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      const account = new Account({
        Username: Username,
        TariffId: new Types.ObjectId(TariffID),
        Seller: new Types.ObjectId(SellerID),
      });

      const result = await account.save();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static RemoveAccount: RequestHandler = async (req, res, next) => {
    try {
      const id: string = req.params.id;

      const result = await Account.deleteOne({ _id: new Types.ObjectId(id) });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static PayAccounts: RequestHandler = async (req, res, next) => {
    try {
      const accountNames = req.body;
      for (const username of accountNames) {
        const accounts = await Account.find({
          Username: username,
          Payed: false,
        });

        if (accounts)
          for (const account of accounts) {
            account.Payed = true;
            await account.save();
          }
      }

      res.status(200).json("Payments Changed Successfully!");
    } catch (error) {
      next(error);
    }
  };

  static PayAccount: RequestHandler = async (req, res, next) => {
    try {
      const id: string = req.params.id;

      const account = await Account.findOne({ _id: id });

      if (account) {
        account.Payed = !account.Payed;
        await account.save();
      }

      res.status(200).json("Payment Changed!");
    } catch (error) {
      next(error);
    }
  };

  static ConvertTariff: RequestHandler = async (req, res, next) => {
    try {
      let count = 0;
      const tariffs = await Tariff.find();
      const accounts = await Account.find();

      if (accounts)
        for (const account of accounts) {
          const tariff = tariffs.find(
            (tariff) => tariff.Title == account.Tariff
          );
          if (tariff && !account.TariffId) {
            account.TariffId = tariff?._id as Types.ObjectId;
            await account.save();
            count++;
          }
        }

      res.status(200).json(`${count} Accounts Converted!`);
    } catch (error) {
      next(error);
    }
  };
}
export default AccountController;
