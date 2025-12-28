import { Types } from "mongoose";

import { getModel } from "../db/MongooseModel";
import type { IAccount } from "../models/Account";
import { AccountSchema } from "../models/Account";
import { HttpError } from "../utils/HttpError";
import { isValidObjectId } from "../utils/validation";
import AccountHelpers from "./account/AccountHelpers";

type AccountListOptions = {
  page?: number;
  limit?: number;
};

export const getAccountList = async ({ page, limit }: AccountListOptions): Promise<IAccount[]> => {
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  let query = AccountModel.find();
  if (typeof limit === "number" && limit > 0) {
    const safePage = typeof page === "number" && page > 0 ? page : 1;
    query = query.skip((safePage - 1) * limit).limit(limit);
  }
  return query;
};

export const getAccountById = async (id: string): Promise<IAccount> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid account id");
  }
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const account = await AccountModel.findOne({ _id: new Types.ObjectId(id) });
  if (!account) {
    throw new HttpError(404, "Account not found");
  }
  return account;
};

export const addAccount = async (params: {
  username: string;
  tariffId: string;
  sellerId: string;
}): Promise<IAccount> => {
  if (!isValidObjectId(params.tariffId)) {
    throw new HttpError(400, "Invalid tariffId");
  }
  if (!isValidObjectId(params.sellerId)) {
    throw new HttpError(400, "Invalid sellerId");
  }
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const account = new AccountModel({
    Username: params.username,
    TariffId: new Types.ObjectId(params.tariffId),
    Seller: new Types.ObjectId(params.sellerId),
  });
  const result = await account.save();
  const sellerId = AccountHelpers.GetAccountSellerId(result);
  if (sellerId) {
    AccountHelpers.UpsertSellerAccountCache(sellerId, result);
  }
  return result;
};

export const removeAccount = async (id: string): Promise<{ deletedCount: number }> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid account id");
  }
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const account = await AccountModel.findByIdAndDelete(id);
  if (!account) {
    throw new HttpError(404, "Account not found");
  }
  const sellerId = AccountHelpers.GetAccountSellerId(account);
  if (sellerId) {
    AccountHelpers.RemoveSellerAccountFromCache(sellerId, account.Username);
  }
  return { deletedCount: 1 };
};

export const payAccounts = async (params: {
  accountIds: string[];
  payed: boolean;
}): Promise<void> => {
  if (params.accountIds.some((id) => !isValidObjectId(id))) {
    throw new HttpError(400, "Invalid account id");
  }
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const targetIds = params.accountIds.map((id) => new Types.ObjectId(id));
  const accounts = await AccountModel.find({ _id: { $in: targetIds } });
  await AccountModel.updateMany({ _id: { $in: targetIds } }, { $set: { Payed: params.payed } });
  accounts.forEach((account) => {
    account.Payed = params.payed;
    const sellerId = AccountHelpers.GetAccountSellerId(account);
    if (sellerId) {
      AccountHelpers.UpsertSellerAccountCache(sellerId, account);
    }
  });
};

export const payAccount = async (id: string, payed: boolean): Promise<IAccount> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid account id");
  }
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const result = await AccountModel.findByIdAndUpdate(
    id,
    { $set: { Payed: payed } },
    { new: true },
  );
  if (!result) {
    throw new HttpError(404, "Account not found");
  }
  const sellerId = AccountHelpers.GetAccountSellerId(result);
  if (sellerId) {
    AccountHelpers.UpsertSellerAccountCache(sellerId, result);
  }
  return result;
};
