import { Document, Types } from "mongoose";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import MarzbanAccount from "../models/MarzbanAccount";
import { ISeller, SellerSchema } from "../models/Seller";
import { IAccount, AccountSchema } from "../models/Account";
import { ITariff, TariffSchema } from "../models/Tariff";
import ConfigFile from "./Config";
import Helper from "./Helper";
import { ITariffInbound, TariffInboundSchema } from "../models/TariffInbound";
import { getModel } from "./MongooseModel";

class AccountHelpers {
  static MarzbanAccountsList: Record<
    string,
    Record<string, { users: MarzbanAccount[]; timestamp: number }>
  > = {};
  static CACHE_TTL_MS = 20 * 60 * 1000; // 20 دقیقه

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
    const TariffInboundModel = await getModel<ITariffInbound>(
      "TariffInbound",
      TariffInboundSchema
    );
    const tariffInbounds = await TariffInboundModel.find({
      TariffId: tariff._id,
    });

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

  static InvalidateSellerAllCache = (seller: string) => {
    if (AccountHelpers.MarzbanAccountsList[seller]) {
      delete AccountHelpers.MarzbanAccountsList[seller]["all"];
      delete AccountHelpers.MarzbanAccountsList[seller]["unpaid"];
    }
  };

  static GetSellerAccounts = async (sellerTitle: string, IsAll: boolean) => {
    const adminUsername = await ConfigFile.GetSellerAdminUsername();
    let condition = {};
    if (sellerTitle.toLowerCase() !== adminUsername.toLowerCase()) {
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const seller = await SellerModel.findOne({ Title: sellerTitle });
      condition = {
        ...condition,
        Seller: seller?._id,
      };
    }
    if (!IsAll) condition = { ...condition, Payed: false };
    const AccountModel = await getModel<IAccount>("Account", AccountSchema);
    const accounts = await AccountModel.find(condition);
    return accounts;
  };

  static RemoveDeletedAccountSeller = async (
    authorization: string | undefined,
    seller: Document | undefined
  ) => {
    if (seller) {
      const resultMarzban = await AccountHelpers.GetMarzbanAccounts(
        authorization,
        String(seller.get("Title"))
      );
      const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] })
        .users;
      const marzbanUsernames = new Set(
        sellerUsers.map((user) => user.username)
      );

      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const sellerAccounts = await AccountModel.find({
        Seller: seller,
        Payed: true,
      });

      // پیدا کردن اکانت‌هایی که در مرزبان نیستند
      const accountsToDelete = sellerAccounts.filter(
        (acc) => !marzbanUsernames.has(acc.Username)
      );

      // حذف اکانت‌ها
      await AccountModel.deleteMany({
        _id: { $in: accountsToDelete.map((acc) => acc._id) },
      });
    }
  };

  static GetTotalUnpaid = async (
    seller: Document | undefined,
    IsAdmin: boolean
  ) => {
    let totalLimitUnpaid = 0;
    let totalPriceUnpaid = 0;
    const AccountModel = await getModel<IAccount>("Account", AccountSchema);
    const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
    const accounts = IsAdmin
      ? await AccountModel.find({ Payed: false })
      : await AccountModel.find({ Seller: seller, Payed: false });
    const tariffs = await TariffModel.find({ IsFree: false });
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
    const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
    const tariffs = await TariffModel.find({ _id: { $in: tariffIds } }).lean();
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

  static GetAccountsSmart = async (
    authorization: string | undefined,
    isAll: boolean,
    seller: string,
    sellerSubscriptionUrl: string,
    isAdmin: boolean
  ) => {
    const startTime = Date.now(); // زمان شروع کل
    if (isAdmin) {
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const sellers = await SellerModel.find({});
      const allAccountsResults = await Promise.all(
        sellers.map(async (sellerObj) => {
          try {
            const marzbanAccountsResult =
              await AccountHelpers.GetMarzbanAccountsAndStoreSmart(
                authorization,
                sellerObj.Title,
                isAll
              );
            if (marzbanAccountsResult.failed) {
              return [];
            }
            const sellerAccounts = await AccountHelpers.GetSellerAccounts(
              sellerObj.Title,
              isAll
            );
            const mixed = await AccountHelpers.GetMixedAccount(
              marzbanAccountsResult.users,
              sellerAccounts,
              sellerObj.Title,
              sellerSubscriptionUrl
            );

            // --- لاگ اکانت‌های حذف‌شده و پرداخت‌نشده فقط برای ادمین ---
            // اکانت‌های حذف‌شده و پرداخت‌نشده (در دیتابیس Payed=false و در مرزبان نیستند)
            const marzbanUsernames = new Set(
              marzbanAccountsResult.users.map((u) => u.username)
            );
            const deletedAndUnpaidAccounts = sellerAccounts.filter(
              (acc) =>
                !marzbanUsernames.has(acc.Username) && acc.Payed === false
            );
            if (deletedAndUnpaidAccounts.length > 0) {
              console.log(
                `[GetAccountsSmart] Deleted & Unpaid accounts for seller=${sellerObj.Title}:`,
                deletedAndUnpaidAccounts.map((acc) => acc.Username)
              );
            }
            // --- پایان لاگ ---
            return mixed;
          } catch {
            return [];
          }
        })
      );
      const result = allAccountsResults.flat();
      const endTime = Date.now();
      console.log(
        `[GetAccountsSmart] Total time (all sellers): ${endTime - startTime} ms`
      );
      return result;
    } else {
      const sellerStart = Date.now();
      try {
        const marzbanAccountsResult =
          await AccountHelpers.GetMarzbanAccountsAndStoreSmart(
            authorization,
            seller,
            isAll
          );
        if (marzbanAccountsResult.failed) {
          return [];
        }
        const sellerAccounts = await AccountHelpers.GetSellerAccounts(
          seller,
          isAll
        );
        const mixed = await AccountHelpers.GetMixedAccount(
          marzbanAccountsResult.users,
          sellerAccounts,
          seller,
          sellerSubscriptionUrl
        );
        const endTime = Date.now();
        console.log(
          `[GetAccountsSmart] Total time (single seller): ${
            endTime - sellerStart
          } ms`
        );
        return mixed;
      } catch {
        return [];
      }
    }
  };

  // متد کش هوشمند برای گرفتن کاربران مرزبان و ذخیره در کش
  static GetMarzbanAccountsAndStoreSmart = async (
    authorization: string | undefined,
    seller: string,
    isAll: boolean
  ) => {
    const cacheKey = isAll ? "all" : "unpaid";
    const now = Date.now();
    if (
      AccountHelpers.MarzbanAccountsList[seller]?.[cacheKey] &&
      now - AccountHelpers.MarzbanAccountsList[seller][cacheKey].timestamp <
        AccountHelpers.CACHE_TTL_MS
    ) {
      // console.error(`[GetMarzbanAccountsAndStoreSmart] seller=${seller} cache HIT`); // کامنت شد طبق درخواست
      return {
        users: AccountHelpers.MarzbanAccountsList[seller][cacheKey].users,
        failed: false,
      };
    }
    // اگر کش نبود یا منقضی شده بود، از مرزبان بگیر
    try {
      //const marzbanStart = Date.now();
      const resultMarzban = await AccountHelpers.GetMarzbanAccounts(
        authorization,
        seller
      );
      //const marzbanEnd = Date.now();
      // console.error(`[GetMarzbanAccountsAndStoreSmart] seller=${seller} Marzban API: ${marzbanEnd - marzbanStart} ms`); // کامنت شد طبق درخواست
      const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] })
        .users;
      if (!AccountHelpers.MarzbanAccountsList[seller])
        AccountHelpers.MarzbanAccountsList[seller] = {};
      AccountHelpers.MarzbanAccountsList[seller][cacheKey] = {
        users: sellerUsers,
        timestamp: now,
      };
      // console.error(`[GetMarzbanAccountsAndStoreSmart] seller=${seller} cache MISS`); // کامنت شد طبق درخواست
      return { users: sellerUsers, failed: false };
    } catch (error) {
      const err = error;
      let status: unknown = err;
      if (typeof err === "object" && err !== null) {
        const e = err as {
          response?: { status?: number };
          code?: string;
          message?: string;
        };
        status = e?.response?.status || e?.code || e?.message || err;
      }
      // console.warn(`[GetMarzbanAccountsAndStoreSmart] seller=${seller} failed with status=${status}`); // کامنت شد طبق درخواست
      return { users: [], failed: true, error: status };
    }
  };

  // متد گرفتن کاربران مرزبان (با سرچ)
  static GetMarzbanAccounts = async (
    authorization: string | undefined,
    username: string
  ) => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/users";
    const params = { search: username };
    const config = {
      headers: { Authorization: authorization },
      params: params,
      timeout: 300000, // افزایش به 5 دقیقه
    };
    return axios.get(apiURL, config);
  };

  static normalizeAccountOutput = (
    account: unknown
  ): Record<string, unknown> => {
    if (typeof account !== "object" || account === null) {
      return {};
    }
    const acc = account as {
      id?: unknown;
      _id?: unknown;
      counter?: unknown;
      username?: unknown;
      Username?: unknown;
      package?: unknown;
      Tariff?: unknown;
      price?: unknown;
      data_limit?: unknown;
      data_limit_string?: unknown;
      used_traffic?: unknown;
      used_traffic_string?: unknown;
      expire?: unknown;
      expire_string?: unknown;
      status?: unknown;
      subscription_url?: unknown;
      online?: unknown;
      online_at?: unknown;
      sub_updated_at?: unknown;
      sub_last_user_agent?: unknown;
      payed?: unknown;
      Payed?: unknown;
      note?: unknown;
    };
    return {
      id: acc.id ?? acc._id ?? null,
      counter: acc.counter ?? null,
      username: acc.username ?? acc.Username ?? null,
      package: acc.package ?? acc.Tariff ?? null,
      price: acc.price ?? null,
      data_limit: acc.data_limit ?? null,
      data_limit_string: acc.data_limit_string ?? null,
      used_traffic: acc.used_traffic ?? null,
      used_traffic_string: acc.used_traffic_string ?? null,
      expire: acc.expire ?? null,
      expire_string: acc.expire_string ?? null,
      status: acc.status ?? null,
      subscription_url: acc.subscription_url ?? null,
      online: acc.online ?? null,
      online_at: acc.online_at ?? null,
      sub_updated_at: acc.sub_updated_at ?? null,
      sub_last_user_agent: acc.sub_last_user_agent ?? null,
      payed:
        acc.payed ??
        (acc.Payed === true ? "Paid" : acc.Payed === false ? "Unpaid" : null),
      note: acc.note ?? null,
    };
  };
}

export default AccountHelpers;
