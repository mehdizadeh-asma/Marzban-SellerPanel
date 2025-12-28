import { Types } from "mongoose";

import { getModel } from "../../db/MongooseModel";
import type { IAccount } from "../../models/Account";
import type MarzbanAccount from "../../models/MarzbanAccount";
import type { ITariff } from "../../models/Tariff";
import { TariffSchema } from "../../models/Tariff";
import Helper from "../../utils/Helper";

export const getSubscriptionUrl = (
  marzbanSubscriptionUrl: string,
  sellerSubscriptionUrl: string,
): string => {
  const url =
    sellerSubscriptionUrl.trim() !== ""
      ? sellerSubscriptionUrl + "/sub/" + marzbanSubscriptionUrl.split("/sub/")[1]
      : marzbanSubscriptionUrl;

  return url;
};

export const getMixedAccount = async (
  marzbanAccounts: MarzbanAccount[],
  sellerAccounts: IAccount[],
  sellername: string,
  sellerSubscriptionUrl: string,
): Promise<Record<string, unknown>[]> => {
  const marzbanAccountMap = new Map(marzbanAccounts.map((account) => [account.username, account]));

  const tariffIds = sellerAccounts
    .map((item) => {
      const tariffId = item.TariffId;
      if (tariffId instanceof Types.ObjectId) return tariffId;
      if (typeof tariffId === "string") {
        return Types.ObjectId.isValid(tariffId) ? new Types.ObjectId(tariffId) : undefined;
      }
      const nestedId = tariffId?._id;
      if (nestedId instanceof Types.ObjectId) return nestedId;
      if (typeof nestedId === "string") {
        return Types.ObjectId.isValid(nestedId) ? new Types.ObjectId(nestedId) : undefined;
      }
      return undefined;
    })
    .filter((tariffId): tariffId is Types.ObjectId => Boolean(tariffId));
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const tariffs = await TariffModel.find({ _id: { $in: tariffIds } }).lean();
  const tariffMap = new Map(tariffs.map((tariff) => [tariff._id.toString(), tariff]));

  const accounts = sellerAccounts.map((item) => {
    const tariffIdString =
      item.TariffId instanceof Types.ObjectId
        ? item.TariffId.toString()
        : typeof item.TariffId === "string"
          ? item.TariffId
          : item.TariffId?._id
            ? item.TariffId._id.toString()
            : undefined;

    const marzbanAccount = marzbanAccountMap.get(item.Username);
    const tariff = tariffIdString ? tariffMap.get(tariffIdString) : undefined;
    if (!marzbanAccount) {
      return {
        id: item._id,
        username: item.Username,
        tarif: item.Tariff,
        payed: item.Payed ? "Paid" : "Unpaid",
      };
    }

    const dataLimitString = Helper.CalculateTraffic(marzbanAccount.data_limit);
    const usedTrafficString = Helper.CalculateTraffic(marzbanAccount.used_traffic);
    const expireString = Helper.CalculateRemainDate(marzbanAccount.expire);
    const isOnline = Helper.IsOnline(marzbanAccount.online_at);
    const onlineAt = Helper.CalculateOnlineDate(marzbanAccount.online_at);
    const subUpdatedAt = Helper.CalculateUpdateSubscriptionDate(marzbanAccount.sub_updated_at);

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
      subscription_url: getSubscriptionUrl(marzbanAccount.subscription_url, sellerSubscriptionUrl),
      online: isOnline,
      online_at: onlineAt,
      sub_updated_at: subUpdatedAt,
      sub_last_user_agent: marzbanAccount.sub_last_user_agent,
      payed: item.Payed ? "Paid" : "Unpaid",
      note: marzbanAccount.note,
    };
  });

  return accounts
    .filter((acc) => Object.prototype.hasOwnProperty.call(acc, "data_limit"))
    .reverse();
};

export const normalizeAccountOutput = (account: unknown): Record<string, unknown> => {
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
    payed: acc.payed ?? (acc.Payed === true ? "Paid" : acc.Payed === false ? "Unpaid" : null),
    note: acc.note ?? null,
  };
};
