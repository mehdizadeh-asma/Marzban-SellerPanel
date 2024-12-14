import { Document } from "mongoose";
import axios from "axios";

import MarzbanAccount from "../models/MarzbanAccount";
import Seller, { ISeller } from "../models/Seller";
import Account, { IAccount } from "../models/Account";
import Tariff from "../models/Tariff";

import ConfigFile from "./Config";
import Helper from "./Helper";

class AccountHelpers {
  static MarzbanAccountsList: Record<string, MarzbanAccount[]> = {};

  static GetInbounds = async (authorization: string | undefined) => {
    let vmesses: string[] | undefined = undefined;
    let vlesses: string[] | undefined = undefined;
    let trojans: string[] | undefined = undefined;

    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/inbounds";

    const result = await axios.get(apiURL, {
      headers: { Authorization: authorization },
    });
    if (result && result.status == 200) {
      const inbounds = result.data as {
        vmess: { tag: string }[];
        vless: { tag: string }[];
        trojan: { tag: string }[];
      };
      if (inbounds.vmess) vmesses = inbounds.vmess.map((vmess) => vmess.tag);
      if (inbounds.vless) vlesses = inbounds.vless.map((vless) => vless.tag);
      if (inbounds.trojan)
        trojans = inbounds.trojan.map((trojan) => trojan.tag);

      return { vmess: vmesses, vless: vlesses, trojan: trojans };
    }
    throw new Error("No Inbound Found!!");
  };

  static GetMarzbanAccounts = async (
    authorization: string | undefined,
    username: string
  ) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/users";

    const params = {
      search: username,
    };

    const config = {
      headers: { Authorization: authorization },
      params: params,
      timeout: 120000,
    };

    return axios.get(apiURL, config);
  };

  static GetMarzbanAccountsAndStore = async (
    authorization: string | undefined,
    seller: string
  ) => {
    const resultMarzban = await this.GetMarzbanAccounts(authorization, "");
    const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] })
      .users;
    this.MarzbanAccountsList = {
      ...this.MarzbanAccountsList,
      [seller]: sellerUsers,
    };
  };

  static GetSellerAccounts = async (sellerTitle: string, IsAll: boolean) => {
    const adminUsername = await ConfigFile.GetSellerAdminUsername();

    let condition = {};

    if (sellerTitle.toLowerCase() !== adminUsername.toLowerCase()) {
      const seller = await Seller.findOne({ Title: sellerTitle });
      condition = {
        ...condition,
        Seller: seller?._id,
      };
    }

    if (!IsAll) condition = { ...condition, Payed: false };

    const accounts = await Account.find(condition);

    return accounts;
  };

  static GetTotalUnpaid = async (
    seller: Document | undefined,
    IsAdmin: boolean
  ) => {
    let totalLimitUnpaid = 0;
    let totalPriceUnpaid = 0;

    const accounts = IsAdmin
      ? await Account.find({
          Payed: false,
        })
      : await Account.find({
          Seller: seller,
          Payed: false,
        });

    const tariffs = await Tariff.find({ IsFree: false });

    accounts.map((account) => {
      const tariff = tariffs.find(
        (tariff) => tariff._id.toString() == account.TariffId._id.toString()
      );
      if (tariff) {
        totalPriceUnpaid += tariff.Price ?? 0;
        totalLimitUnpaid += tariff.DataLimit ?? 0;
      }
    });

    return {
      TotalLimitUnpaid: totalLimitUnpaid,
      TotalPriceUnpaid: totalPriceUnpaid,
    };
  };

  static GetUsernameAvailable = async (
    seller: ISeller,
    username: string,
    authorization: string | undefined
  ) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/";
    let generateUsername = "";

    try {
      do {
        seller.Counter++;
        generateUsername =
          username + seller.Counter.toString().padStart(3, "0");

        await axios.get(apiURL + generateUsername, {
          headers: { Authorization: authorization },
        });
      } while (seller.Counter > 10000000);
    } catch {
      // empty
    }

    if (generateUsername != "") return generateUsername;

    throw new Error("Username is Empty");
  };

  static GetSubscriptionUrl = (
    marzbanSubscriptionUrl: string,
    sellerSubscriptionUrl: string
  ) => {
    const url =
      sellerSubscriptionUrl.trim() !== ""
        ? sellerSubscriptionUrl +
          "/sub/" +
          marzbanSubscriptionUrl.split("/sub/")[1]
        : marzbanSubscriptionUrl;

    return url;
  };

  static CheckToken = async (authorization?: string) => {
    try {
      const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin";

      const config = {
        headers: { Authorization: authorization },
        params: {},
      };

      const resultMarzban = await axios.get(apiURL, config);

      return resultMarzban.status === 200;
    } catch (error) {
      console.log(error);
    }
  };

  static GetMixedAccount = async (
    marzbanAccounts: MarzbanAccount[],
    sellerAccounts: IAccount[],
    sellername: string,
    sellerSubscriptionUrl: string
  ) => {
    const accounts = await Promise.all(
      sellerAccounts.map(async (item) => {
        const marzbanAccount = marzbanAccounts.filter(
          (account) => account.username == item.Username
        )[0];

        const tarrif = await Tariff.findOne({ _id: item.TariffId });

        if (!marzbanAccount)
          return {
            id: item._id,
            username: item.Username,
            tarif: item.Tariff,
            payed: item.Payed ? "Paid" : "Unpaid",
          };

        return {
          id: item._id,
          counter: +marzbanAccount.username.replace(sellername, ""),
          username: marzbanAccount.username,
          package: item.Tariff,
          price: tarrif?.Price,
          data_limit: marzbanAccount.data_limit,
          data_limit_string: Helper.CalculateTraffic(marzbanAccount.data_limit),
          used_traffic: marzbanAccount.used_traffic,
          used_traffic_string: Helper.CalculateTraffic(
            marzbanAccount.used_traffic
          ),
          expire: marzbanAccount.expire,
          expire_string: Helper.CalculateRemainDate(marzbanAccount.expire),
          status: marzbanAccount.status,
          subscription_url: AccountHelpers.GetSubscriptionUrl(
            marzbanAccount.subscription_url,
            sellerSubscriptionUrl
          ),
          online: Helper.IsOnline(marzbanAccount.online_at),
          online_at: Helper.CalculateOnlineDate(marzbanAccount.online_at),
          sub_updated_at: Helper.CalculateUpdateSubscriptionDate(
            marzbanAccount.sub_updated_at
          ),
          sub_last_user_agent: marzbanAccount.sub_last_user_agent,
          payed: item.Payed ? "Paid" : "Unpaid",
          note: marzbanAccount.note,
        };
      })
    );
    return accounts.filter((acc) => acc.data_limit).reverse();
  };

  static LoginToMarzban = async (username: string, password: string) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin/token";

    const config = {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    };

    const resultLogin = await axios.post(
      apiURL,
      {
        username: username,
        password: password,
      },
      config
    );
    return (resultLogin.data as { access_token: string }).access_token;
  };
}

export default AccountHelpers;
