import { Document, Types } from "mongoose";
import axios from "axios";

import MarzbanAccount from "../models/MarzbanAccount";
import Seller, { ISeller } from "../models/Seller";
import Account from "../models/Account";
import Tariff from "../models/Tariff";

import ConfigFile from "./Config";

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
    authorization: string | undefined
    // offset: number,
    // limit: number
  ) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/users";

    // const params = {
    //   offset: offset,
    //   limit: limit,
    // };

    const config = {
      headers: { Authorization: authorization },
      // params: params,
      timeout: 120000,
    };

    return axios.get(apiURL, config);
  };

  static GetMarzbanAccountsAndStore = async (
    authorization: string | undefined,
    seller: string
    // offset: number = 0,
    // limit: number = 0
  ) => {
    const resultMarzban = await this.GetMarzbanAccounts(
      authorization
      // offset,
      // limit
    );
    const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] })
      .users;
    this.MarzbanAccountsList = {
      ...this.MarzbanAccountsList,
      [seller]: sellerUsers,
    };

    // console.log("MarzbanAccountList Filled!!!!");
  };

  static GetSellerAccounts = async (sellerTitle: string, IsAll: boolean) => {
    // console.log("Start Getting From MongoDB ## " + sellerTitle);

    const sellerUsername = await ConfigFile.GetSellerAdminUsername();

    const seller = await Seller.findOne({ Title: sellerTitle });

    let condition = {};

    if (sellerTitle.toLowerCase() !== sellerUsername.toLowerCase())
      condition = {
        ...condition,
        Seller: seller?._id as Types.ObjectId,
      };

    if (!IsAll) condition = { ...condition, Payed: false };

    const accounts = await Account.find(condition);

    // console.log("End Getting From MongoDB -- Count : " + accounts.length);
    return accounts;
  };

  static GetTotalUnpaid = async (
    seller: Document | undefined,
    IsAdmin: boolean
  ) => {
    let totalLimitUnpaid = 0;
    let totalPriceUnpaid = 0;

    // console.log("Start Calculate totalUnpaid ## " + seller.Title);
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
      const tariff = tariffs.find((tariff) => tariff._id === account.TariffId);
      if (tariff) {
        totalPriceUnpaid += tariff.Price ?? 0;
        totalLimitUnpaid += tariff.DataLimit ?? 0;
      }
    });

    // console.log("End Calculate totalUnpaid -- " + totalUnpaid);
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
}

export default AccountHelpers;
