import { RequestHandler } from "express";
import { Types } from "mongoose";
import { getModel } from "../utils/MongooseModel";
import { IAccount, AccountSchema } from "../models/Account";

class AccountController {
  static GetAccountList: RequestHandler = async (req, res, next) => {
    try {
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const result = await AccountModel.find();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    try {
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const id: string = req.params.id;
      const account = await AccountModel.findOne({ _id: new Types.ObjectId(id) });
      if (!account) throw new Error("Account not found!");
      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    try {
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const { Username, TariffID, SellerID } = req.body as {
        Username: string | undefined;
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      const account = new AccountModel({
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
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const id: string = req.params.id;
      const result = await AccountModel.deleteOne({ _id: new Types.ObjectId(id) });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static PayAccounts: RequestHandler = async (req, res, next) => {
    try {
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const accountIds = req.body as string[];
      for (const id of accountIds) {
        const accounts = await AccountModel.find({
          _id: id,
        });
        if (accounts)
          for (const account of accounts) {
            account.Payed = !account.Payed;
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
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const id: string = req.params.id;
      const account = await AccountModel.findOne({
        _id: id,
      });
      if (account) {
        account.Payed = !account.Payed;
        await account.save();
      }
      res.status(200).json("Payment Changed!");
    } catch (error) {
      next(error);
    }
  };
}
export default AccountController;
