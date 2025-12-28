import axios from "axios";
import type { QueryFilter } from "mongoose";
import { Types } from "mongoose";

import ConfigFile from "../../config/Config";
import MongooseDbManagement from "../../db/MongooseDbManagement";
import { getModel } from "../../db/MongooseModel";
import type { AuthenticatedRequest } from "../../middleware/auth";
import type { IAccount } from "../../models/Account";
import { AccountSchema } from "../../models/Account";
import type MarzbanAccount from "../../models/MarzbanAccount";
import type { ISeller, SellerDocument } from "../../models/Seller";
import { SellerSchema } from "../../models/Seller";
import type { ITariff } from "../../models/Tariff";
import { TariffSchema } from "../../models/Tariff";
import { HttpError } from "../../utils/HttpError";
import { isValidObjectId } from "../../utils/validation";
import AccountHelpers from "../account/AccountHelpers";
import { tryUpsertMarzbanAccountCache } from "./MarzbanCacheService";
import { getSessionSeller, isAdminRequest } from "./MarzbanContext";

export const getAccounts = async (params: {
  authReq: AuthenticatedRequest;
  sellerParam?: string;
  isAllParam?: string;
  authorization?: string;
}): Promise<Record<string, unknown>[]> => {
  const isAll = params.isAllParam === "true";
  const sellerSubscriptionUrl = await ConfigFile.GetSubscriptionURL();
  const isAdmin = isAdminRequest(params.authReq);
  let sellerIdentifier = params.sellerParam;

  if (!isAdmin) {
    const sessionSeller = await getSessionSeller(params.authReq);
    if (!sessionSeller) {
      throw new HttpError(403, "Seller context not found for current session");
    }
    sellerIdentifier = sessionSeller.Title;
  } else if (!sellerIdentifier) {
    sellerIdentifier = await ConfigFile.GetSellerAdminUsername();
  }

  if (!sellerIdentifier) {
    throw new HttpError(400, "Seller identifier is required");
  }

  const accounts = await AccountHelpers.GetAccountsSmart(
    params.authorization ?? params.authReq.headers.authorization,
    isAll,
    sellerIdentifier,
    sellerSubscriptionUrl,
    isAdmin,
  );

  return Array.isArray(accounts) ? accounts.map(AccountHelpers.NormalizeAccountOutput) : [];
};

export const getAccount = async (params: {
  authReq: AuthenticatedRequest;
  sellerParam?: string;
  search: string;
  authorization?: string;
}): Promise<Record<string, unknown>[]> => {
  const sellerSubscriptionUrl = await ConfigFile.GetSubscriptionURL();
  const isAdmin = isAdminRequest(params.authReq);
  let sellerIdentifier = params.sellerParam;
  let sellerAccountFilter: QueryFilter<IAccount> = {};

  if (!isAdmin) {
    const sessionSeller = await getSessionSeller(params.authReq);
    if (!sessionSeller) {
      throw new HttpError(403, "Seller context not found for current session");
    }
    sellerIdentifier = sessionSeller.Title;
    sellerAccountFilter = { Seller: sessionSeller._id };
  } else if (!sellerIdentifier) {
    sellerIdentifier = await ConfigFile.GetSellerAdminUsername();
  }

  if (!sellerIdentifier) {
    throw new HttpError(400, "Seller identifier is required");
  }

  const marzbanAccountsResult = await AccountHelpers.GetMarzbanAccounts(
    params.authorization ?? params.authReq.headers.authorization,
    undefined,
    params.search,
  );

  const marzbanAccounts =
    (
      marzbanAccountsResult.data as {
        users?: IAccount[];
      }
    )?.users || [];

  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const sellerAccounts = await AccountModel.find(sellerAccountFilter);

  const mixed = await AccountHelpers.GetMixedAccount(
    marzbanAccounts as unknown as MarzbanAccount[],
    sellerAccounts,
    sellerIdentifier,
    sellerSubscriptionUrl,
  );

  return mixed.map(AccountHelpers.NormalizeAccountOutput);
};

export const addAccount = async (params: {
  authReq: AuthenticatedRequest;
  body: {
    username?: string;
    note: string;
    tariffId: string;
    onhold: boolean;
    sellerId?: string;
    sellerTitle?: string;
    seller?: string;
    accountPrefix?: string;
    accountUsername?: string;
  };
  authorization?: string;
}): Promise<unknown> => {
  if (!(await MongooseDbManagement.checkLicense())) {
    throw new HttpError(403, "License is not available or expired");
  }

  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user";
  const {
    username,
    note,
    tariffId,
    onhold,
    sellerId,
    sellerTitle,
    seller: sellerSlug,
    accountPrefix,
    accountUsername,
  } = params.body;

  if (!tariffId || !isValidObjectId(tariffId)) {
    throw new HttpError(400, "TariffId is required and must be valid");
  }

  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);

  const isAdmin = isAdminRequest(params.authReq);
  let seller: SellerDocument | null = null;

  if (isAdmin) {
    if (sellerId) {
      if (!isValidObjectId(sellerId)) {
        throw new HttpError(400, "Invalid sellerId");
      }
      seller = await SellerModel.findById(sellerId);
    }

    if (!seller) {
      const selectorTitle = sellerTitle ?? sellerSlug ?? username;
      if (selectorTitle) {
        seller = await SellerModel.findOne({
          Title: selectorTitle,
        });
      }
    }

    if (!seller) {
      throw new HttpError(404, "Seller not Found");
    }
  } else {
    seller = await getSessionSeller(params.authReq);
    if (!seller) {
      throw new HttpError(403, "Seller context not found for current session");
    }
  }

  const authorization = params.authorization ?? params.authReq.headers.authorization;

  const usernamePrefix = (accountPrefix ?? accountUsername ?? username)?.trim();
  if (!usernamePrefix) {
    throw new HttpError(400, "Account username prefix is required");
  }

  const tariff = await TariffModel.findOne({ _id: new Types.ObjectId(tariffId) });

  if (!tariff) {
    throw new HttpError(404, "Tariff not Found");
  }

  let data_limit: number | undefined;
  let expireTimestamp: number | undefined;
  const expireDate = new Date();
  let expireDuration: number | undefined;
  let onHoldTimeout: Date | undefined;
  let status: string | undefined;

  if (tariff.Duration && tariff.Duration > 0) {
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
  }

  if (tariff.DataLimit && tariff.DataLimit > 0) {
    data_limit = tariff.DataLimit * 1024 * 1024 * 1024;
  }

  const generateUsername = await AccountHelpers.GetUsernameAvailable(
    seller,
    usernamePrefix,
    authorization,
  );

  const { proxies, inbounds } = await AccountHelpers.GenerateProxiesAndInbounds(
    authorization,
    tariff,
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
      headers: {
        Authorization: authorization,
      },
    },
  );

  const account = new AccountModel();
  account.Username = generateUsername;
  account.Seller = seller;
  account.Tariff = tariff.Title;
  account.TariffId = tariff;
  account.Payed = false;

  let accountSaved = false;
  try {
    await account.save();
    accountSaved = true;
    await seller.save();
    AccountHelpers.UpsertSellerAccountCache(seller._id.toString(), account);
  } catch (error) {
    if (accountSaved) {
      try {
        await AccountModel.deleteOne({ _id: account._id });
      } catch (cleanupError) {
        console.log("[AddAccount] Failed to rollback account record:", cleanupError);
      }
    }
    try {
      await axios.delete(`${apiURL}/${generateUsername}`, {
        headers: { Authorization: authorization },
      });
    } catch (cleanupError) {
      console.log("[AddAccount] Failed to rollback Marzban user:", cleanupError);
    }
    throw error;
  }

  await tryUpsertMarzbanAccountCache("AddAccount", authorization, seller, generateUsername);

  return result.data;
};

export const editAccount = async (params: {
  authReq?: AuthenticatedRequest;
  username: string;
  status: string;
  authorization?: string;
}): Promise<unknown> => {
  if (!params.username) {
    throw new HttpError(404, "Username not Found");
  }

  const authorization = params.authorization ?? params.authReq?.headers.authorization;
  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + params.username;
  const result = await axios.put(
    apiURL,
    { status: params.status },
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const account = await AccountModel.findOne({
    Username: params.username,
  });

  const sellerId = account ? AccountHelpers.GetAccountSellerId(account) : undefined;
  const seller = sellerId ? await SellerModel.findOne({ _id: sellerId }) : null;

  if (seller) {
    await tryUpsertMarzbanAccountCache("EditAccount", authorization, seller, params.username);
  }

  return result.data;
};

export const disableAccount = async (params: {
  authReq: AuthenticatedRequest;
  username: string;
  status: string;
  authorization?: string;
}): Promise<unknown> => {
  if (!params.username) {
    throw new HttpError(404, "Username not Found");
  }
  if (!params.status) {
    throw new HttpError(400, "Status not provided");
  }

  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const account = await AccountModel.findOne({
    Username: params.username,
  });

  if (!account) {
    throw new HttpError(404, "Account Not Found");
  }

  const isAdmin = isAdminRequest(params.authReq);
  let seller: SellerDocument | null = null;

  if (isAdmin) {
    const sellerId = AccountHelpers.GetAccountSellerId(account);
    seller = sellerId ? await SellerModel.findOne({ _id: sellerId }) : null;
  } else {
    const sessionSeller = await getSessionSeller(params.authReq);
    if (!sessionSeller) {
      throw new HttpError(403, "Seller context not found for current session");
    }

    if (AccountHelpers.GetAccountSellerId(account) !== sessionSeller._id.toString()) {
      throw new HttpError(403, "You are not allowed to modify this account");
    }

    seller = sessionSeller;
  }

  const authorization = params.authorization ?? params.authReq.headers.authorization;
  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + params.username;
  const result = await axios.put(
    apiURL,
    { status: params.status },
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  if (seller) {
    AccountHelpers.PatchMarzbanAccountCache(seller.Title, params.username, {
      status: params.status,
    });
  }

  return result.data;
};

export const renewAccount = async (params: {
  authReq: AuthenticatedRequest;
  body: {
    tariffId: string;
    username: string;
    sellerId?: string;
    sellerTitle?: string;
  };
  paramsSeller?: string;
  authorization?: string;
}): Promise<unknown> => {
  if (!(await MongooseDbManagement.checkLicense())) {
    throw new HttpError(403, "License is not available or expired");
  }

  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);

  const { tariffId, username, sellerId, sellerTitle } = params.body;

  if (!username) {
    throw new HttpError(404, "Username not Found");
  }

  if (!tariffId || !isValidObjectId(tariffId)) {
    throw new HttpError(400, "TariffId is required and must be valid");
  }

  const tariff = await TariffModel.findOne({
    _id: new Types.ObjectId(tariffId),
  });

  if (!tariff) {
    throw new HttpError(404, "Tariff not Found");
  }

  const isAdmin = isAdminRequest(params.authReq);
  let seller: SellerDocument | null = null;

  if (isAdmin) {
    let selectorId = sellerId;
    let selectorTitle = sellerTitle;

    if (selectorId && !isValidObjectId(selectorId)) {
      throw new HttpError(400, "Invalid sellerId");
    }
    if (!selectorId && params.paramsSeller && isValidObjectId(params.paramsSeller)) {
      selectorId = params.paramsSeller;
    }
    if (!selectorTitle && params.paramsSeller) {
      selectorTitle = params.paramsSeller;
    }

    if (selectorId && isValidObjectId(selectorId)) {
      seller = await SellerModel.findById(selectorId);
    }

    if (!seller && selectorTitle) {
      seller = await SellerModel.findOne({
        Title: selectorTitle,
      });
    }

    if (!seller) {
      const fallbackAccount = await AccountModel.findOne({
        Username: username,
      }).sort({
        _id: -1,
      });

      if (fallbackAccount) {
        let accountSellerId: Types.ObjectId | undefined;
        if (fallbackAccount.Seller instanceof Types.ObjectId) {
          accountSellerId = fallbackAccount.Seller;
        } else if (fallbackAccount.Seller?._id) {
          accountSellerId = fallbackAccount.Seller._id as Types.ObjectId;
        }
        if (accountSellerId) {
          seller = await SellerModel.findById(accountSellerId);
        }
      }
    }

    if (!seller) {
      throw new HttpError(404, "Seller not Found");
    }
  } else {
    seller = await getSessionSeller(params.authReq);
    if (!seller) {
      throw new HttpError(403, "Seller context not found for current session");
    }

    const ownsAccount = await AccountModel.exists({
      Username: username,
      Seller: seller._id,
    });

    if (!ownsAccount) {
      throw new HttpError(403, "You are not allowed to renew this account");
    }
  }

  const authorization = params.authorization ?? params.authReq.headers.authorization;

  let previousMarzbanAccount: MarzbanAccount | null = null;
  try {
    previousMarzbanAccount = await AccountHelpers.GetMarzbanAccountByUsername(
      authorization,
      seller,
      username,
    );
  } catch (error) {
    console.log("[RenewAccount] Failed to capture Marzban state:", error);
  }

  let data_limit: number | undefined;
  let expireTimestamp: number | undefined;

  if (tariff.Duration && tariff.Duration > 0) {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + tariff.Duration);
    currentDate.setHours(20, 30, 0);
    expireTimestamp = Math.floor(currentDate.getTime() / 1000);
  }

  if (tariff.DataLimit && tariff.DataLimit > 0) {
    data_limit = tariff.DataLimit * 1024 * 1024 * 1024;
  }

  const { inbounds } = await AccountHelpers.GenerateProxiesAndInbounds(authorization, tariff);

  const accountApiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + username;

  const result = await axios.put(
    accountApiURL,
    {
      expire: expireTimestamp,
      data_limit: data_limit,
      inbounds: inbounds,
    },
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  const resetApiURL = `${accountApiURL}/reset`;
  await axios.post(
    resetApiURL,
    {},
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  const account = new AccountModel();
  account.Username = username;
  account.Seller = seller;
  account.Tariff = tariff.Title;
  account.TariffId = tariff;
  account.Payed = false;
  try {
    await account.save();
    AccountHelpers.UpsertSellerAccountCache(seller._id.toString(), account);
  } catch (error) {
    if (previousMarzbanAccount) {
      try {
        await axios.put(
          accountApiURL,
          {
            expire: previousMarzbanAccount.expire,
            data_limit: previousMarzbanAccount.data_limit,
          },
          {
            headers: {
              Authorization: authorization,
            },
          },
        );
        await axios.post(
          resetApiURL,
          {},
          {
            headers: {
              Authorization: authorization,
            },
          },
        );
      } catch (rollbackError) {
        console.log("[RenewAccount] Failed to rollback Marzban changes:", rollbackError);
      }
    }
    throw error;
  }

  await tryUpsertMarzbanAccountCache("RenewAccount", authorization, seller, username);

  return result.data;
};

export const removeAccount = async (params: {
  authReq: AuthenticatedRequest;
  username: string;
  authorization?: string;
}): Promise<void> => {
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const account = await AccountModel.findOne({
    Username: params.username,
    Payed: false,
  });

  if (!account) {
    throw new HttpError(404, "Account Not Found!");
  }

  const isAdmin = isAdminRequest(params.authReq);
  let seller: SellerDocument | null = null;

  if (isAdmin) {
    const sellerId = AccountHelpers.GetAccountSellerId(account);
    seller = sellerId ? await SellerModel.findOne({ _id: sellerId }) : null;
  } else {
    const sessionSeller = await getSessionSeller(params.authReq);
    if (!sessionSeller) {
      throw new HttpError(403, "Seller context not found for current session");
    }
    if (AccountHelpers.GetAccountSellerId(account) !== sessionSeller._id.toString()) {
      throw new HttpError(403, "You are not allowed to delete this account");
    }
    seller = sessionSeller;
  }

  const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/user/" + params.username;
  const authorization = params.authorization ?? params.authReq.headers.authorization;

  try {
    await axios.delete(apiURL, {
      headers: {
        Authorization: authorization,
      },
    });
  } catch (err: unknown) {
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
      throw err;
    }
  }

  await AccountModel.deleteMany({
    Username: params.username,
    Payed: false,
  });

  if (seller) {
    AccountHelpers.RemoveSellerAccountFromCache(seller._id.toString(), account.Username);
    AccountHelpers.RemoveMarzbanAccountFromCache(seller.Title, params.username);
  }
};

export const revokeSub = async (params: {
  authReq: AuthenticatedRequest;
  username: string;
  authorization?: string;
}): Promise<void> => {
  if (!params.username) {
    throw new HttpError(404, "Username not Found");
  }

  const apiURL = `${await ConfigFile.GetMarzbanURL()}/api/user/${params.username}/revoke_sub`;
  const authorization = params.authorization ?? params.authReq.headers.authorization;

  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const account = await AccountModel.findOne({
    Username: params.username,
  });

  if (!account) {
    throw new HttpError(404, "Account Not Found!");
  }

  const isAdmin = isAdminRequest(params.authReq);
  let seller: SellerDocument | null = null;

  if (isAdmin) {
    const sellerId = AccountHelpers.GetAccountSellerId(account);
    seller = sellerId ? await SellerModel.findOne({ _id: sellerId }) : null;
  } else {
    const sessionSeller = await getSessionSeller(params.authReq);
    if (!sessionSeller) {
      throw new HttpError(403, "Seller context not found for current session");
    }
    if (AccountHelpers.GetAccountSellerId(account) !== sessionSeller._id.toString()) {
      throw new HttpError(403, "You are not allowed to revoke this account");
    }
    seller = sessionSeller;
  }

  await axios.post(
    apiURL,
    {},
    {
      headers: {
        Authorization: authorization,
      },
    },
  );

  if (seller) {
    await tryUpsertMarzbanAccountCache("RevokeSub", authorization, seller, params.username);
  }
};
