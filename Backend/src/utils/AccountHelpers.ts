import { Document, Types } from "mongoose";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import MarzbanAccount from "../models/MarzbanAccount";
import Seller, { ISeller } from "../models/Seller";
import Account, { IAccount } from "../models/Account";
import Tariff, { ITariff } from "../models/Tariff";

import ConfigFile from "./Config";
import Helper from "./Helper";
import TariffInbound from "../models/TariffInbound";

class AccountHelpers {
  static MarzbanAccountsList: Record<string, MarzbanAccount[]> = {};

  static GetInbounds = async (authorization: string | undefined) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/inbounds";

    const result = await axios.get(apiURL, {
      headers: { Authorization: authorization },
    });
    if (result && result.status == 200) {
      const inbounds = result.data as {
        vmess: { tag: string }[];
        vless: { tag: string }[];
        trojan: { tag: string }[];
        shadowsocks: { tag: string }[];
      };

      const formattedInbounds = Object.entries(inbounds).flatMap(
        ([inboundType, inboundTags]) =>
          inboundTags.map(({ tag }) => ({
            InboundType: inboundType,
            InboundTag: tag,
          }))
      );

      return formattedInbounds;
    }
    throw new Error("No Inbound Found!!");
  };

  static GenerateProxiesAndInbounds = async (
    authorization: string | undefined,
    tariff: ITariff
  ) => {
    const vlessUUID = uuidv4();
    const vmessUUID = uuidv4();

    const tariffInbounds = await TariffInbound.find({ TariffId: tariff._id });

    const getInbound = await AccountHelpers.GetInbounds(authorization);

    const inbounds: {
      vmess?: string[];
      vless?: string[];
      trojan?: string[];
      shadowsocks?: string[];
    } = {};
    const proxies: {
      vmess?: { id: string };
      vless?: { id: string; flow: string };
      trojan?: { password: string };
      shadowsocks?: { password: string; method: string };
    } = {};

    // Handle vmess
    const vmessInbounds = getInbound.filter(
      (inbound) => inbound.InboundType === "vmess"
    );
    if (
      vmessInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "vmess")
        .length > 0
    ) {
      proxies.vmess = { id: vmessUUID };

      const vmessInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "vmess")
          .map((tariffInbound) => tariffInbound.InboundTag)
      );

      inbounds.vmess = vmessInbounds
        .filter((inbound) => vmessInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    // Handle vless
    const vlessInbounds = getInbound.filter(
      (inbound) => inbound.InboundType === "vless"
    );
    if (
      vlessInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "vless")
        .length > 0
    ) {
      const flow = await ConfigFile.GetMarzbanFlow();
      proxies.vless = {
        id: vlessUUID,
        flow: flow === "none" ? "" : flow,
      };

      const vlessInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "vless")
          .map((tariffInbound) => tariffInbound.InboundTag)
      );

      inbounds.vless = vlessInbounds
        .filter((inbound) => vlessInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    // Handle trojan
    const trojanInbounds = getInbound.filter(
      (inbound) => inbound.InboundType === "trojan"
    );
    if (
      trojanInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "trojan")
        .length > 0
    ) {
      proxies.trojan = { password: Helper.GenerateRandomPassword(12) };

      const trojanInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "trojan")
          .map((tariffInbound) => tariffInbound.InboundTag)
      );

      inbounds.trojan = trojanInbounds
        .filter((inbound) => trojanInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    // Handle shadowsocks
    const shadowsocksInbounds = getInbound.filter(
      (inbound) => inbound.InboundType === "shadowsocks"
    );
    if (
      shadowsocksInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "shadowsocks")
        .length > 0
    ) {
      proxies.shadowsocks = {
        password: Helper.GenerateRandomPassword(22),
        method: "chacha20-ietf-poly1305",
      };

      const shadowsocksInboundTags = new Set(
        tariffInbounds
          .filter(
            (tariffInbound) => tariffInbound.InboundType === "shadowsocks"
          )
          .map((tariffInbound) => tariffInbound.InboundTag)
      );

      inbounds.shadowsocks = shadowsocksInbounds
        .filter((inbound) => shadowsocksInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    // Remove entries with no inbounds
    if (!inbounds.vmess?.length) delete proxies.vmess;
    if (!inbounds.vless?.length) delete proxies.vless;
    if (!inbounds.trojan?.length) delete proxies.trojan;
    if (!inbounds.shadowsocks?.length) delete proxies.shadowsocks;

    // Remove inbounds entry if no proxy was created
    if (!proxies.vmess) delete inbounds.vmess;
    if (!proxies.vless) delete inbounds.vless;
    if (!proxies.trojan) delete inbounds.trojan;
    if (!proxies.shadowsocks) delete inbounds.shadowsocks;

    return { proxies, inbounds };
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
      } while (seller.Counter < 10000000);
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
    const marzbanAccountMap = new Map(
      marzbanAccounts.map((account) => [account.username, account])
    );

    const tariffIds = sellerAccounts.map((item) => item.TariffId);
    const tariffs = await Tariff.find({ _id: { $in: tariffIds } }).lean();
    const tariffMap = new Map(
      tariffs.map((tariff) => [tariff._id.toString(), tariff])
    );

    const accounts = sellerAccounts.map((item) => {
      const tariffIdString =
        item.TariffId instanceof Types.ObjectId
          ? item.TariffId.toString()
          : item.TariffId?._id?.toString();

      const marzbanAccount = marzbanAccountMap.get(item.Username);
      const tariff = tariffMap.get(tariffIdString);
      if (!marzbanAccount) {
        return {
          id: item._id,
          username: item.Username,
          tarif: item.Tariff,
          payed: item.Payed ? "Paid" : "Unpaid",
        };
      }

      // Pre-calculate data-related fields
      const dataLimitString = Helper.CalculateTraffic(
        marzbanAccount.data_limit
      );
      const usedTrafficString = Helper.CalculateTraffic(
        marzbanAccount.used_traffic
      );
      const expireString = Helper.CalculateRemainDate(marzbanAccount.expire);
      const isOnline = Helper.IsOnline(marzbanAccount.online_at);
      const onlineAt = Helper.CalculateOnlineDate(marzbanAccount.online_at);
      const subUpdatedAt = Helper.CalculateUpdateSubscriptionDate(
        marzbanAccount.sub_updated_at
      );

      return {
        id: item._id,
        counter: +marzbanAccount.username.replace(sellername, ""),
        username: marzbanAccount.username,
        package: item.Tariff,
        price: tariff?.Price,
        data_limit: marzbanAccount.data_limit,
        data_limit_string: dataLimitString,
        used_traffic: marzbanAccount.used_traffic,
        used_traffic_string: usedTrafficString,
        expire: marzbanAccount.expire,
        expire_string: expireString,
        status: marzbanAccount.status,
        subscription_url: AccountHelpers.GetSubscriptionUrl(
          marzbanAccount.subscription_url,
          sellerSubscriptionUrl
        ),
        online: isOnline,
        online_at: onlineAt,
        sub_updated_at: subUpdatedAt,
        sub_last_user_agent: marzbanAccount.sub_last_user_agent,
        payed: item.Payed ? "Paid" : "Unpaid",
        note: marzbanAccount.note,
      };
    });

    const fillteredUnpaidDeletedAccount = accounts.filter(
      (acc) => acc.payed == "Unpaid" && !acc.data_limit
    );

    if (
      fillteredUnpaidDeletedAccount.length > 0 &&
      sellername.toLowerCase() ==
        (await ConfigFile.GetSellerAdminUsername()).toLowerCase()
    ) {
      console.log("Log Unpaid and Deleted Account :");
      fillteredUnpaidDeletedAccount.map((acc) => console.log(acc.username));
    }
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
