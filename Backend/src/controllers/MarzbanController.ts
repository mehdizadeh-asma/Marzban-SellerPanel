import { RequestHandler } from "express";
import { Types } from "mongoose";
import axios from "axios";

import ConfigFile from "../utils/Config";
import MongooseDbManagement from "../utils/MongooseDbManagement";
import { getModel } from "../utils/MongooseModel";
import MarzbanAccount from "../models/MarzbanAccount";
import AccountHelpers from "../utils/AccountHelpers";
import { ISeller, SellerSchema } from "../models/Seller";
import { ITariff, TariffSchema } from "../models/Tariff";
import { IAccount, AccountSchema } from "../models/Account";

class MarzbanController {
  static Login: RequestHandler = async (req, res, next) => {
    try {
      let { username, password } = req.body as {
        username: string;
        password: string;
      };

      username = username.trim();
      password = password.trim();

      const sellerUsername = await ConfigFile.GetSellerAdminUsername();
      const sellerPassword = await ConfigFile.GetSellerAdminPassword();

      //Login Admin Seller Panel
      if (username.toLowerCase() == sellerUsername.toLowerCase()) {
        if (password !== sellerPassword) {
          res.status(500).json({ Message: "Invalid Account Information" });
          return;
        }
        try {
          const marzbanUsername = await ConfigFile.GetMarzbanUsername();
          const marzbanPassword = await ConfigFile.GetMarzbanPassword();
          const token = await AccountHelpers.LoginToMarzban(
            marzbanUsername,
            marzbanPassword
          );

          const totalUnpaid = await AccountHelpers.GetTotalUnpaid(
            undefined,
            true
          );

          res.status(200).json({
            Token: token,
            Username: sellerUsername,
            IsAdmin: true,
            Limit: 0,
            TotalPrice: totalUnpaid.TotalPriceUnpaid,
          });
          return;
        } catch (error) {
          next(error);
          return;
        }
      }

      //Login Seller
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const seller = await SellerModel.findOne({
        Username: username,
        Password: password,
        Status: "Active",
      });

      if (seller) {
        try {
          const token = await AccountHelpers.LoginToMarzban(
            seller.MarzbanUsername,
            seller.MarzbanPassword
          );

          // فقط جمعه‌ها اجرا شود
          if (new Date().getDay() === 5)
            await AccountHelpers.RemoveDeletedAccountSeller(
              `Bearer ${token}`,
              seller
            );

          const totalUnpaid = await AccountHelpers.GetTotalUnpaid(
            seller,
            false
          );

          res.status(200).json({
            Token: token,
            Username: seller.Title,
            IsAdmin: false,
            Limit: seller.Limit - totalUnpaid.TotalLimitUnpaid,
            TotalPrice: totalUnpaid.TotalPriceUnpaid,
          });
        } catch (error) {
          next(error);
          return;
        }
      } else {
        res.status(500).json({ Message: "Invalid Account Information" });
      }
    } catch (error) {
      next(error);
    }
  };

  static GetAccounts: RequestHandler = async (req, res, next) => {
    try {
      const isAll = req.params.isall === "true";
      const seller = req.params.seller;
      const sellerSubscriptionUrl = await ConfigFile.GetSubscriptionURL();
      const adminUsername = await ConfigFile.GetSellerAdminUsername();
      const isAdmin = seller === adminUsername;
      // استفاده از متد بهینه و کش هوشمند
      const accounts = await AccountHelpers.GetAccountsSmart(
        req.headers.authorization,
        isAll,
        seller,
        sellerSubscriptionUrl,
        isAdmin
      );
      const normalized = Array.isArray(accounts)
        ? accounts.map(AccountHelpers.normalizeAccountOutput)
        : [];
      res.status(200).json(normalized);
    } catch (error) {
      next(error);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    try {
      const seller = req.params.seller;
      const search = req.params.search;

      const sellerSubscriptionUrl = await ConfigFile.GetSubscriptionURL();

      let allMixed: object[] = [];
      const marzbanAccountsResult = await AccountHelpers.GetMarzbanAccounts(
        req.headers.authorization,
        undefined,
        search
      );
      const marzbanAccounts =
        (
          marzbanAccountsResult.data as {
            users?: IAccount[];
          }
        )?.users || [];
      // دریافت اکانت‌های دیتابیس فقط با همین سرچ
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const sellerAccounts = await AccountModel.find();
      const mixed = await AccountHelpers.GetMixedAccount(
        marzbanAccounts as unknown as MarzbanAccount[],
        sellerAccounts,
        seller,
        sellerSubscriptionUrl
      );
      allMixed = allMixed.concat(mixed);

      const normalized = allMixed.map(AccountHelpers.normalizeAccountOutput);
      // حذف لاگ خروجی
      res.status(200).json(normalized);
      return;
    } catch (error) {
      next(error);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    try {
      if (!(await MongooseDbManagement.checkLicense()))
        throw new Error("License is not Available or Expired!");

      const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user";

      const { username, note, tariffId, onhold } = req.body as {
        username: string;
        note: string;
        tariffId: string;
        onhold: boolean;
      };

      if (!username && username === "") {
        res.status(404).json("Username not Found");
        return;
      }

      if (!tariffId && tariffId === "") {
        res.status(404).json("TariffId not Found");
        return;
      }
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const seller = await SellerModel.findOne({ Title: username });
      if (!seller) {
        res.status(404).json("Seller not Found");
        return;
      }
      const tariff = await TariffModel.findOne({
        _id: new Types.ObjectId(tariffId),
      });
      if (!tariff) {
        res.status(404).json("Tariff not Found");
        return;
      }

      let data_limit: number | undefined = undefined;

      let expireTimestamp: number | undefined = undefined;
      const expireDate = new Date();

      let expireDuration: number | undefined = undefined;
      let onHoldTimeout: Date | undefined = undefined;

      let status: string | undefined = undefined;

      if (tariff.Duration && tariff.Duration > 0)
        if (onhold) {
          expireDuration = (tariff.Duration + 1) * (60 * 60 * 24);

          expireDate.setDate(expireDate.getDate() + 30);
          expireDate.setHours(20, 30, 0);

          onHoldTimeout = expireDate;
          status = "on_hold";
        } else {
          expireDate.setDate(expireDate.getDate() + tariff.Duration);
          expireDate.setHours(20, 30, 0);

          expireTimestamp = Math.floor(expireDate.getTime() / 1000);
        }

      if (tariff.DataLimit && tariff.DataLimit > 0)
        data_limit = tariff.DataLimit * 1024 * 1024 * 1024;

      const generateUsername = await AccountHelpers.GetUsernameAvailable(
        seller,
        username,
        req.headers.authorization
      );

      const { proxies, inbounds } =
        await AccountHelpers.GenerateProxiesAndInbounds(
          req.headers.authorization,
          tariff
        );

      const result = await axios.post(
        apiURL,
        {
          username: generateUsername,
          note: note,
          proxies: proxies,
          inbounds: inbounds,
          expire: expireTimestamp,
          data_limit: data_limit,
          on_hold_expire_duration: expireDuration,
          on_hold_timeout: onHoldTimeout,
          status: status,
        },
        {
          headers: { Authorization: req.headers.authorization },
        }
      );

      const account = new AccountModel();
      account.Username = generateUsername;
      account.Seller = seller;
      account.Tariff = tariff.Title;
      account.TariffId = tariff;
      account.Payed = false;

      await account.save();
      await seller.save();
      // invalidate کش فقط همین seller
      AccountHelpers.InvalidateSellerAllCache(seller.Title);
      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static EditAccount: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;
      const { status } = req.body as { status: string };
      if (!req.params.username && req.params.username === "") {
        res.status(404).json("Username not Found");
        return;
      }
      const result = await axios.put(
        apiURL,
        {
          status: status,
        },
        {
          headers: { Authorization: req.headers.authorization },
        }
      );
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const account = await AccountModel.findOne({
        Username: req.params.username,
      });
      const seller = account
        ? await SellerModel.findOne({ _id: account.Seller })
        : null;
      if (seller) AccountHelpers.InvalidateSellerAllCache(seller.Title);
      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static DisableAccount: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;
      const { status } = req.body as { status: string };
      if (!req.params.username && req.params.username === "") {
        res.status(404).json("Username not Found");
        return;
      }
      const result = await axios.put(
        apiURL,
        { status: status },
        { headers: { Authorization: req.headers.authorization } }
      );
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const account = await AccountModel.findOne({
        Username: req.params.username,
      });
      const seller = account
        ? await SellerModel.findOne({ _id: account.Seller })
        : null;
      if (seller) AccountHelpers.InvalidateSellerAllCache(seller.Title);
      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static RenewAccount: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      if (!(await MongooseDbManagement.checkLicense()))
        throw new Error("License is not Available or Expired!");

      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const { tariffId, username } = req.body as {
        tariffId: string;
        username: string;
      };

      if (!username && username === "") {
        res.status(404).json("Username not Found");
        return;
      }

      if (!tariffId && tariffId === "") {
        res.status(404).json("TariffId not Found");
        return;
      }

      const tariff = await TariffModel.findOne({
        _id: new Types.ObjectId(tariffId),
      });

      if (!tariff) {
        res.status(404).json("Tariff not Found");
        return;
      }

      const seller = await SellerModel.findOne({ Title: req.params.seller });

      if (!seller) {
        res.status(404).json("Seller not Found");
        return;
      }

      let data_limit: number | undefined = undefined;

      let expireTimestamp: number | undefined = undefined;

      if (tariff.Duration && tariff.Duration > 0) {
        const currentDate = new Date();

        currentDate.setDate(currentDate.getDate() + tariff.Duration);
        currentDate.setHours(20, 30, 0);

        expireTimestamp = Math.floor(currentDate.getTime() / 1000);
      }

      if (tariff.DataLimit && tariff.DataLimit > 0)
        data_limit = tariff.DataLimit * 1024 * 1024 * 1024;

      const { inbounds } = await AccountHelpers.GenerateProxiesAndInbounds(
        req.headers.authorization,
        tariff
      );

      let apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + username;
      const result = await axios.put(
        apiURL,
        {
          expire: expireTimestamp,
          data_limit: data_limit,
          inbounds: inbounds,
        },
        {
          headers: { Authorization: req.headers.authorization },
        }
      );

      apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + username + "/reset";
      await axios.post(
        apiURL,
        {},
        {
          headers: { Authorization: req.headers.authorization },
        }
      );

      const account = new AccountModel();
      account.Username = username;
      account.Seller = seller;
      account.Tariff = tariff.Title;
      account.TariffId = tariff;
      account.Payed = false;
      await account.save();
      // invalidate کش فقط همین seller و ادمین
      AccountHelpers.InvalidateSellerAllCache(seller.Title);
      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static RemoveAccount: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const account = await AccountModel.findOne({
        Username: req.params.username,
        Payed: false,
      });
      if (!account) {
        res.status(404).json({ message: "Account Not Found!" });
        return;
      }
      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;
      try {
        await axios.delete(apiURL, {
          headers: { Authorization: req.headers.authorization },
        });
      } catch (err: unknown) {
        // اگر خطا 404 بود، یعنی اکانت در مرزبان نیست، پس می‌توان حذف کرد
        interface AxiosErrorWithResponse {
          response?: {
            status?: number;
          };
        }
        const error = err as AxiosErrorWithResponse;
        if (
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof error.response === "object" &&
          error.response !== null &&
          "status" in error.response &&
          error.response.status !== 404
        ) {
          // اگر خطای دیگری بود، حذف نکن و خطا را برگردان
          return next(err);
        }
      }
      const seller = await SellerModel.findOne({ _id: account.Seller });
      await AccountModel.findOneAndDelete({
        Username: req.params.username,
        Payed: false,
      });
      if (seller) AccountHelpers.InvalidateSellerAllCache(seller.Title);
      res.status(200).json({ message: "Delete Success!" });
    } catch (error) {
      next(error);
    }
  };

  static RevokeSub: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const apiURL = `${await ConfigFile.GetMarzbanURL()}/api/user/${
        req.params.username
      }/revoke_sub`;

      await axios.post(
        apiURL,
        {},
        {
          headers: { Authorization: req.headers.authorization },
        }
      );

      // invalidate کش seller مربوط به این یوزر
      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const account = await AccountModel.findOne({
        Username: req.params.username,
      });
      const seller = account
        ? await SellerModel.findOne({ _id: account.Seller })
        : null;
      if (seller) AccountHelpers.InvalidateSellerAllCache(seller.Title);

      res.status(200).json({ message: "Revoke Success!" });
    } catch (error) {
      next(error);
    }
  };
}

export default MarzbanController;
