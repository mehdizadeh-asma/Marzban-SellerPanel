import axios from "axios";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import ConfigFile from "../../config/Config";
import { getModel } from "../../db/MongooseModel";
import type { IAccount } from "../../models/Account";
import { AccountSchema } from "../../models/Account";
import type MarzbanAccount from "../../models/MarzbanAccount";
import type { ISeller } from "../../models/Seller";
import { SellerSchema } from "../../models/Seller";
import type { ITariff } from "../../models/Tariff";
import { TariffSchema } from "../../models/Tariff";
import type { ITariffInbound } from "../../models/TariffInbound";
import { TariffInboundSchema } from "../../models/TariffInbound";
import Helper from "../../utils/Helper";
import * as MarzbanClient from "../marzban/MarzbanClient";
import type { MarzbanAccountsCache, SellerAccountsCache } from "./AccountCache";
import * as AccountCache from "./AccountCache";
import * as AccountFormatter from "./AccountFormatter";

class AccountHelpers {
  static get MarzbanAccountsList(): MarzbanAccountsCache {
    return AccountCache.getMarzbanAccountsCache();
  }

  static set MarzbanAccountsList(value: MarzbanAccountsCache) {
    AccountCache.setMarzbanAccountsCache(value);
  }

  static get SellerAccountsList(): SellerAccountsCache {
    return AccountCache.getSellerAccountsCache();
  }

  static set SellerAccountsList(value: SellerAccountsCache) {
    AccountCache.setSellerAccountsCache(value);
  }

  static CACHE_TTL_MS = 20 * 60 * 1000;

  static GetInbounds = MarzbanClient.getInbounds;
  static LoginToMarzban = MarzbanClient.loginToMarzban;
  static CheckToken = MarzbanClient.checkToken;
  static GetMarzbanAccounts = MarzbanClient.getMarzbanAccounts;
  static GetMarzbanAccountByUsername = MarzbanClient.getMarzbanAccountByUsername;
  static GetSellerMarzbanPassword = MarzbanClient.getSellerMarzbanPassword;

  static InvalidateSellerAllCache = AccountCache.invalidateSellerAllCache;
  static InvalidateSellerAccountCache = AccountCache.invalidateSellerAccountCache;
  static UpsertSellerAccountCache = AccountCache.upsertSellerAccountCache;
  static RemoveSellerAccountFromCache = AccountCache.removeSellerAccountFromCache;
  static UpsertMarzbanAccountCache = AccountCache.upsertMarzbanAccountCache;
  static PatchMarzbanAccountCache = AccountCache.patchMarzbanAccountCache;
  static RemoveMarzbanAccountFromCache = AccountCache.removeMarzbanAccountFromCache;

  static GetSubscriptionUrl = AccountFormatter.getSubscriptionUrl;
  static GetMixedAccount = AccountFormatter.getMixedAccount;
  static NormalizeAccountOutput = AccountFormatter.normalizeAccountOutput;

  static GenerateProxiesAndInbounds = async (
    authorization: string | undefined,
    tariff: ITariff,
  ): Promise<{
    proxies: {
      vmess?: { id: string };
      vless?: { id: string; flow: string };
      trojan?: { password: string };
      shadowsocks?: { password: string; method: string };
    };
    inbounds: {
      vmess?: string[];
      vless?: string[];
      trojan?: string[];
      shadowsocks?: string[];
    };
  }> => {
    const vlessUUID = uuidv4();
    const vmessUUID = uuidv4();
    const TariffInboundModel = await getModel<ITariffInbound>("TariffInbound", TariffInboundSchema);
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

    const vmessInbounds = getInbound.filter((inbound) => inbound.InboundType === "vmess");
    if (
      vmessInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "vmess").length > 0
    ) {
      proxies.vmess = { id: vmessUUID };

      const vmessInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "vmess")
          .map((tariffInbound) => tariffInbound.InboundTag),
      );

      inbounds.vmess = vmessInbounds
        .filter((inbound) => vmessInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    const vlessInbounds = getInbound.filter((inbound) => inbound.InboundType === "vless");
    if (
      vlessInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "vless").length > 0
    ) {
      const flow = await ConfigFile.GetMarzbanFlow();
      proxies.vless = {
        id: vlessUUID,
        flow: flow === "none" ? "" : flow,
      };

      const vlessInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "vless")
          .map((tariffInbound) => tariffInbound.InboundTag),
      );

      inbounds.vless = vlessInbounds
        .filter((inbound) => vlessInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    const trojanInbounds = getInbound.filter((inbound) => inbound.InboundType === "trojan");
    if (
      trojanInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "trojan").length > 0
    ) {
      proxies.trojan = { password: Helper.GenerateRandomPassword(12) };

      const trojanInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "trojan")
          .map((tariffInbound) => tariffInbound.InboundTag),
      );

      inbounds.trojan = trojanInbounds
        .filter((inbound) => trojanInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    const shadowsocksInbounds = getInbound.filter(
      (inbound) => inbound.InboundType === "shadowsocks",
    );
    if (
      shadowsocksInbounds.length > 0 &&
      tariffInbounds.filter((inbound) => inbound.InboundType === "shadowsocks").length > 0
    ) {
      proxies.shadowsocks = {
        password: Helper.GenerateRandomPassword(22),
        method: "chacha20-ietf-poly1305",
      };

      const shadowsocksInboundTags = new Set(
        tariffInbounds
          .filter((tariffInbound) => tariffInbound.InboundType === "shadowsocks")
          .map((tariffInbound) => tariffInbound.InboundTag),
      );

      inbounds.shadowsocks = shadowsocksInbounds
        .filter((inbound) => shadowsocksInboundTags.has(inbound.InboundTag))
        .map((inbound) => inbound.InboundTag);
    }

    if (!inbounds.vmess?.length) delete proxies.vmess;
    if (!inbounds.vless?.length) delete proxies.vless;
    if (!inbounds.trojan?.length) delete proxies.trojan;
    if (!inbounds.shadowsocks?.length) delete proxies.shadowsocks;

    if (!proxies.vmess) delete inbounds.vmess;
    if (!proxies.vless) delete inbounds.vless;
    if (!proxies.trojan) delete inbounds.trojan;
    if (!proxies.shadowsocks) delete inbounds.shadowsocks;

    return { proxies, inbounds };
  };

  static GetAccountSellerId = (account: IAccount): string | undefined => {
    if (!account.Seller) return undefined;
    if (account.Seller instanceof Types.ObjectId) {
      return account.Seller.toString();
    }
    if (typeof account.Seller === "object" && account.Seller._id) {
      return (account.Seller._id as Types.ObjectId).toString();
    }
    return undefined;
  };

  static GetSellerAccounts = async (seller: ISeller, IsAll: boolean): Promise<IAccount[]> => {
    const startTime = Date.now();
    const cacheKey = IsAll ? "all" : "unpaid";
    const sellerCacheKey = seller._id.toString();
    const now = Date.now();
    if (
      AccountHelpers.SellerAccountsList[sellerCacheKey]?.[cacheKey] &&
      now - AccountHelpers.SellerAccountsList[sellerCacheKey][cacheKey].timestamp <
        AccountHelpers.CACHE_TTL_MS
    ) {
      return AccountHelpers.SellerAccountsList[sellerCacheKey][cacheKey].accounts;
    }
    let condition = { Seller: seller._id } as { Seller: Types.ObjectId; Payed?: boolean };
    if (!IsAll) condition = { ...condition, Payed: false };
    const AccountModel = await getModel<IAccount>("Account", AccountSchema);
    const accounts = await AccountModel.find(condition);
    if (!AccountHelpers.SellerAccountsList[sellerCacheKey]) {
      AccountHelpers.SellerAccountsList[sellerCacheKey] = {};
    }
    AccountHelpers.SellerAccountsList[sellerCacheKey][cacheKey] = {
      accounts,
      timestamp: now,
    };
    const durationMs = Date.now() - startTime;
    console.log(
      `[GetSellerAccounts] seller=${seller.Title} isAll=${IsAll} count=${accounts.length} duration_ms=${durationMs}`,
    );
    return accounts;
  };

  static RemoveDeletedAccountSeller = async (
    authorization: string | undefined,
    seller: ISeller,
  ): Promise<void> => {
    if (seller) {
      const resultMarzban = await AccountHelpers.GetMarzbanAccounts(authorization, seller);
      const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] }).users;
      const marzbanUsernames = new Set(sellerUsers.map((user) => user.username));

      const AccountModel = await getModel<IAccount>("Account", AccountSchema);
      const sellerAccounts = await AccountModel.find({
        Seller: seller._id,
        Payed: true,
      });

      const accountsToDelete = sellerAccounts.filter((acc) => !marzbanUsernames.has(acc.Username));

      await AccountModel.deleteMany({
        _id: { $in: accountsToDelete.map((acc) => acc._id) },
      });
    }
  };

  static GetTotalUnpaid = async (
    seller: ISeller | null | undefined,
    IsAdmin: boolean,
  ): Promise<{ TotalLimitUnpaid: number; TotalPriceUnpaid: number }> => {
    let totalLimitUnpaid = 0;
    let totalPriceUnpaid = 0;
    const AccountModel = await getModel<IAccount>("Account", AccountSchema);
    const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
    const accounts = IsAdmin
      ? await AccountModel.find({ Payed: false })
      : await AccountModel.find({ Seller: seller?._id, Payed: false });
    const tariffs = await TariffModel.find({ IsFree: false });
    const tariffMap = new Map(tariffs.map((tariff) => [tariff._id.toString(), tariff]));

    for (const account of accounts) {
      const tariffId =
        account.TariffId instanceof Types.ObjectId
          ? account.TariffId.toString()
          : typeof account.TariffId === "string"
            ? account.TariffId
            : account.TariffId?._id?.toString();
      if (!tariffId) {
        continue;
      }
      const tariff = tariffMap.get(tariffId);
      if (tariff) {
        totalPriceUnpaid += tariff.Price ?? 0;
        totalLimitUnpaid += tariff.DataLimit ?? 0;
      }
    }
    return {
      TotalLimitUnpaid: totalLimitUnpaid,
      TotalPriceUnpaid: totalPriceUnpaid,
    };
  };

  static GetUsernameAvailable = async (
    seller: ISeller,
    username: string,
    authorization: string | undefined,
  ): Promise<string> => {
    const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/";
    let generateUsername = "";

    while (seller.Counter < 10000000) {
      seller.Counter++;
      generateUsername = username + seller.Counter.toString().padStart(3, "0");
      try {
        await axios.get(apiURL + generateUsername, {
          headers: { Authorization: authorization },
        });
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response &&
          (error.response.status === 404 || error.response.status === 400)
        ) {
          return generateUsername;
        }
        throw error;
      }
    }

    throw new Error("Unable to generate username");
  };

  static GetAccountsSmart = async (
    authorization: string | undefined,
    isAll: boolean,
    seller: string,
    sellerSubscriptionUrl: string,
    isAdmin: boolean,
  ): Promise<Record<string, unknown>[]> => {
    const startTime = Date.now();
    if (isAdmin) {
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const sellers = await SellerModel.find({});
      const allAccountsResults = await Promise.all(
        sellers.map(async (sellerObj) => {
          try {
            const marzbanAccountsResult = await AccountHelpers.GetMarzbanAccountsAndStoreSmart(
              authorization,
              sellerObj,
              isAll,
            );
            if (marzbanAccountsResult.failed) {
              return [];
            }
            const sellerAccounts = await AccountHelpers.GetSellerAccounts(sellerObj, isAll);
            const mixed = await AccountHelpers.GetMixedAccount(
              marzbanAccountsResult.users,
              sellerAccounts,
              sellerObj.Title,
              sellerSubscriptionUrl,
            );

            const marzbanUsernames = new Set(marzbanAccountsResult.users.map((u) => u.username));
            const deletedAndUnpaidAccounts = sellerAccounts.filter(
              (acc) => !marzbanUsernames.has(acc.Username) && acc.Payed === false,
            );
            if (deletedAndUnpaidAccounts.length > 0) {
              console.log(
                `[GetAccountsSmart] Deleted & Unpaid accounts for seller=${sellerObj.Title}:`,
                deletedAndUnpaidAccounts.map((acc) => acc.Username),
              );
            }
            return mixed;
          } catch {
            return [];
          }
        }),
      );
      const result = allAccountsResults.flat();
      const endTime = Date.now();
      console.log(`[GetAccountsSmart] Total time (all sellers): ${endTime - startTime} ms`);
      return result;
    } else {
      const sellerStart = Date.now();
      try {
        const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
        const sellerObj = await SellerModel.findOne({ Title: seller });

        if (!sellerObj) {
          return [];
        }

        const marzbanAccountsResult = await AccountHelpers.GetMarzbanAccountsAndStoreSmart(
          authorization,
          sellerObj,
          isAll,
        );
        if (marzbanAccountsResult.failed) {
          return [];
        }

        const sellerAccounts = await AccountHelpers.GetSellerAccounts(sellerObj, isAll);
        const mixed = await AccountHelpers.GetMixedAccount(
          marzbanAccountsResult.users,
          sellerAccounts,
          seller,
          sellerSubscriptionUrl,
        );
        const endTime = Date.now();
        console.log(`[GetAccountsSmart] Total time (single seller): ${endTime - sellerStart} ms`);
        return mixed;
      } catch {
        return [];
      }
    }
  };

  static GetMarzbanAccountsAndStoreSmart = async (
    authorization: string | undefined,
    seller: ISeller,
    isAll: boolean,
  ): Promise<{ users: MarzbanAccount[]; failed: boolean; error?: unknown }> => {
    const cacheKey = isAll ? "all" : "unpaid";
    const now = Date.now();
    if (
      AccountHelpers.MarzbanAccountsList[seller.Title]?.[cacheKey] &&
      now - AccountHelpers.MarzbanAccountsList[seller.Title][cacheKey].timestamp <
        AccountHelpers.CACHE_TTL_MS
    ) {
      return {
        users: AccountHelpers.MarzbanAccountsList[seller.Title][cacheKey].users,
        failed: false,
      };
    }
    try {
      const resultMarzban = await AccountHelpers.GetMarzbanAccounts(authorization, seller);
      const sellerUsers = (resultMarzban.data as { users: MarzbanAccount[] }).users;
      if (!AccountHelpers.MarzbanAccountsList[seller.Title])
        AccountHelpers.MarzbanAccountsList[seller.Title] = {};
      AccountHelpers.MarzbanAccountsList[seller.Title][cacheKey] = {
        users: sellerUsers,
        timestamp: now,
      };
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
      return { users: [], failed: true, error: status };
    }
  };
}

export default AccountHelpers;
