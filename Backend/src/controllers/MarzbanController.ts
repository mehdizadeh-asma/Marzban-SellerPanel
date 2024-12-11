import { RequestHandler } from "express";
import { Types } from "mongoose";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import MarzbanAccount from "../models/MarzbanAccount";
import Account from "../models/Account";
import Seller from "../models/Seller";
import Tariff from "../models/Tariff";

import Helper from "../utils/Helper";
import ConfigFile from "../utils/Config";
import Mongoose from "../utils/Mongoose";
import AccountHelpers from "../utils/AccountHelpers";

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
      const seller = await Seller.findOne({
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

      if (
        !AccountHelpers.MarzbanAccountsList[seller] ||
        seller !== adminUsername
      )
        await AccountHelpers.GetMarzbanAccountsAndStore(
          req.headers.authorization,
          seller
        );

      const marzbanAccounts = AccountHelpers.MarzbanAccountsList[seller];

      const sellerAccounts = await AccountHelpers.GetSellerAccounts(
        seller,
        isAll
      );

      const accounts = await AccountHelpers.GetMixedAccount(
        marzbanAccounts,
        sellerAccounts,
        seller,
        sellerSubscriptionUrl
      );

      res.status(200).json(accounts);
    } catch (error) {
      next(error);
    }
  };

  static GetAccount: RequestHandler = async (req, res, next) => {
    try {
      const seller = req.params.seller;

      const resultAccount = await AccountHelpers.GetMarzbanAccounts(
        req.headers.authorization,
        req.params.search
      );

      const marzbanAccounts = (
        resultAccount.data as { users: MarzbanAccount[] }
      ).users;

      const sellerAccounts = await AccountHelpers.GetSellerAccounts(
        seller,
        true
      );

      const sellerSubscriptionUrl = await ConfigFile.GetSubscriptionURL();

      const accounts = await AccountHelpers.GetMixedAccount(
        marzbanAccounts,
        sellerAccounts,
        seller,
        sellerSubscriptionUrl
      );

      res.status(200).json(accounts);
    } catch (error) {
      next(error);
    }
  };

  static AddAccount: RequestHandler = async (req, res, next) => {
    try {
      const isValidLicense = await Mongoose.CheckLicense();

      if (!isValidLicense)
        throw new Error("License is not Available or Expired!");

      const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user";

      const { username, note, tariffId, onhold } = req.body as {
        username: string;
        note: string;
        tariffId: string;
        onhold: boolean;
      };

      if (!tariffId && tariffId === "") {
        res.status(404).json("TariffId not Found");
        return;
      }

      if (!username && username === "") {
        res.status(404).json("Username not Found");
        return;
      }

      const vlessUUID = uuidv4();
      const vmessUUID = uuidv4();

      const getInbound = await AccountHelpers.GetInbounds(
        req.headers.authorization
      );

      const tariff = await Tariff.findOne({
        _id: new Types.ObjectId(tariffId),
      });

      if (!tariff) {
        res.status(404).json("Tariff not Found");
        return;
      }

      const seller = await Seller.findOne({ Title: username });

      if (!seller) {
        res.status(404).json("Seller not Found");
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
      let inbounds: { vmess?: string[]; vless?: string[]; trojan?: string[] } =
        {};
      let proxies: {
        vmess?: { id: string };
        vless?: { id: string; flow: string };
        trojan?: { password: string };
      } = {};

      if (getInbound.vmess) {
        proxies = {
          ...proxies,
          vmess: {
            id: vmessUUID,
          },
        };
        inbounds = { ...inbounds, vmess: getInbound.vmess };
      }

      if (getInbound.vless) {
        const flow = await ConfigFile.GetMarzbanFlow();
        proxies = {
          ...proxies,
          vless: {
            id: vlessUUID,
            flow: flow == "none" ? "" : flow,
          },
        };
        inbounds = { ...inbounds, vless: getInbound.vless };
      }

      if (getInbound.trojan) {
        proxies = {
          ...proxies,
          trojan: {
            password: Helper.GenerateRandomPassword(12),
          },
        };
        inbounds = { ...inbounds, trojan: getInbound.trojan };
      }

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

      const account = new Account();
      account.Username = generateUsername;
      account.Seller = seller._id as Types.ObjectId;
      account.Tariff = tariff.Title;
      account.TariffId = tariff._id as Types.ObjectId;
      account.Payed = false;

      await account.save();

      await seller.save();

      delete AccountHelpers.MarzbanAccountsList[seller.Title];

      delete AccountHelpers.MarzbanAccountsList[
        await ConfigFile.GetSellerAdminUsername()
      ];

      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static EditAccount: RequestHandler = async (req, res, next) => {
    try {
      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;

      const { status } = req.body as {
        status: string;
      };

      if (!req.params.username && req.params.username === "") {
        res.status(404).json("Username not Found");
        return;
      }

      const result = await axios.put(
        apiURL,
        {
          // proxies: {},
          // inbounds: {},
          status: status,
          // note: "",
          // data_limit_reset_strategy: "no_reset",
          // on_hold_timeout: "",
          // on_hold_expire_duration: 0,
        },
        {
          headers: { Authorization: req.headers.authorization },
        }
      );

      const account = await Account.findOne({ Username: req.params.username });

      const seller = await Seller.findOne({ _id: account?.Seller });

      if (seller) delete AccountHelpers.MarzbanAccountsList[seller.Title];

      delete AccountHelpers.MarzbanAccountsList[
        await ConfigFile.GetSellerAdminUsername()
      ];

      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static DisableAccount: RequestHandler = async (req, res, next) => {
    try {
      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;

      const { status } = req.body as {
        status: string;
      };

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

      const account = await Account.findOne({ Username: req.params.username });

      const seller = await Seller.findOne({ _id: account?.Seller });

      if (seller) delete AccountHelpers.MarzbanAccountsList[seller.Title];

      delete AccountHelpers.MarzbanAccountsList[
        await ConfigFile.GetSellerAdminUsername()
      ];

      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static RenewAccount: RequestHandler = async (req, res, next) => {
    try {
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

      const tariff = await Tariff.findOne({
        _id: new Types.ObjectId(tariffId),
      });

      if (!tariff) {
        res.status(404).json("Tariff not Found");
        return;
      }

      const seller = await Seller.findOne({ Title: req.params.seller });

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

      let apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + username;
      const result = await axios.put(
        apiURL,
        {
          expire: expireTimestamp,
          data_limit: data_limit,
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

      const account = new Account();
      account.Username = username;
      account.Seller = seller._id as Types.ObjectId;
      account.Tariff = tariff.Title;
      account.TariffId = tariff._id as Types.ObjectId;
      account.Payed = false;
      await account.save();

      delete AccountHelpers.MarzbanAccountsList[seller.Title];

      delete AccountHelpers.MarzbanAccountsList[
        await ConfigFile.GetSellerAdminUsername()
      ];

      res.status(200).json(result.data);
    } catch (error) {
      next(error);
    }
  };

  static RemoveAccount: RequestHandler = async (req, res, next) => {
    try {
      const apiURL =
        (await ConfigFile.GetMarzbanURL()) + "/api/user/" + req.params.username;

      const resultget = await axios.get(apiURL, {
        headers: { Authorization: req.headers.authorization },
      });

      if (resultget.data) {
        // const used_traffic =
        //   (resultget.data.used_traffic ?? 0) / (1024 * 1024 * 1024);

        // if (used_traffic < (await ConfigFile.GetIgnoreTrafficToRemove())) {
        await axios.delete(apiURL, {
          headers: { Authorization: req.headers.authorization },
        });

        const account = await Account.findOneAndDelete({
          Username: req.params.username,
          Payed: false,
        });

        const seller = await Seller.findOne({ _id: account?.Seller });

        if (seller) delete AccountHelpers.MarzbanAccountsList[seller.Title];

        delete AccountHelpers.MarzbanAccountsList[
          await ConfigFile.GetSellerAdminUsername()
        ];

        res.status(200).json({ message: "Delete Success!" });
        // }
      }
    } catch (error) {
      next(error);
    }
  };
}

export default MarzbanController;
