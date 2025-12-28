import { Types } from "mongoose";

import type { IAccount } from "../../src/models/Account";
import {
  addAccount,
  getAccountById,
  getAccountList,
  payAccount,
  payAccounts,
  removeAccount,
} from "../../src/services/AccountService";

jest.mock("../../src/db/MongooseModel", () => ({
  __esModule: true,
  getModel: jest.fn(),
}));

jest.mock("../../src/services/account/AccountHelpers", () => ({
  __esModule: true,
  default: {
    GetAccountSellerId: jest.fn(),
    UpsertSellerAccountCache: jest.fn(),
    RemoveSellerAccountFromCache: jest.fn(),
  },
}));

const { getModel } = require("../../src/db/MongooseModel");
const AccountHelpers = require("../../src/services/account/AccountHelpers").default;

describe("AccountService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("paginates account list when limit and page are provided", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const AccountModel = { find: jest.fn().mockReturnValue({ skip: skipMock }) };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);

    await getAccountList({ page: 2, limit: 1 });

    expect(skipMock).toHaveBeenCalledWith(1);
    expect(limitMock).toHaveBeenCalledWith(1);
  });

  it("defaults to page 1 when page is invalid", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const AccountModel = { find: jest.fn().mockReturnValue({ skip: skipMock }) };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);

    await getAccountList({ page: 0, limit: 5 });

    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(5);
  });

  it("upserts cache when adding account", async () => {
    const saved = { _id: new Types.ObjectId(), Username: "u1" } as IAccount;
    const saveMock = jest.fn().mockResolvedValue(saved);
    const AccountModel = function () {
      return { save: saveMock } as { save: jest.Mock };
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue("seller-1");

    const result = await addAccount({
      username: "u1",
      tariffId: new Types.ObjectId().toString(),
      sellerId: new Types.ObjectId().toString(),
    });

    expect(result).toBe(saved);
    expect(AccountHelpers.UpsertSellerAccountCache).toHaveBeenCalledWith("seller-1", saved);
  });

  it("throws when account id is invalid in getAccountById", async () => {
    await expect(getAccountById("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid account id",
    });
  });

  it("throws when tariffId is invalid in addAccount", async () => {
    await expect(
      addAccount({ username: "u", tariffId: "bad", sellerId: new Types.ObjectId().toString() }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariffId",
    });
  });

  it("throws when sellerId is invalid in addAccount", async () => {
    await expect(
      addAccount({ username: "u", tariffId: new Types.ObjectId().toString(), sellerId: "bad" }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid sellerId",
    });
  });

  it("removes cache entry when account is deleted", async () => {
    const account = { Username: "u2", Seller: new Types.ObjectId() } as IAccount;
    (getModel as jest.Mock).mockResolvedValueOnce({
      findByIdAndDelete: jest.fn().mockResolvedValue(account),
    });
    AccountHelpers.GetAccountSellerId.mockReturnValue("seller-2");

    const result = await removeAccount(new Types.ObjectId().toString());

    expect(result).toEqual({ deletedCount: 1 });
    expect(AccountHelpers.RemoveSellerAccountFromCache).toHaveBeenCalledWith("seller-2", "u2");
  });

  it("throws when account id is invalid in removeAccount", async () => {
    await expect(removeAccount("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid account id",
    });
  });

  it("updates cache for batch payment updates", async () => {
    const accounts = [
      { Username: "u1", Payed: false, Seller: new Types.ObjectId() },
      { Username: "u2", Payed: false, Seller: new Types.ObjectId() },
    ] as IAccount[];
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
    (getModel as jest.Mock).mockResolvedValueOnce({
      find: jest.fn().mockResolvedValue(accounts),
      updateMany,
    });
    AccountHelpers.GetAccountSellerId.mockReturnValue("seller-3");

    await payAccounts({
      accountIds: [new Types.ObjectId().toString(), new Types.ObjectId().toString()],
      payed: true,
    });

    expect(updateMany).toHaveBeenCalled();
    expect(accounts.every((account) => account.Payed)).toBe(true);
    expect(AccountHelpers.UpsertSellerAccountCache).toHaveBeenCalledTimes(2);
  });

  it("throws when accountIds are invalid in payAccounts", async () => {
    await expect(payAccounts({ accountIds: ["bad"], payed: true })).rejects.toMatchObject({
      status: 400,
      message: "Invalid account id",
    });
  });

  it("upserts cache when paying a single account", async () => {
    const account = { Username: "u3", Payed: true, Seller: new Types.ObjectId() } as IAccount;
    (getModel as jest.Mock).mockResolvedValueOnce({
      findByIdAndUpdate: jest.fn().mockResolvedValue(account),
    });
    AccountHelpers.GetAccountSellerId.mockReturnValue("seller-4");

    const result = await payAccount(new Types.ObjectId().toString(), true);

    expect(result).toBe(account);
    expect(AccountHelpers.UpsertSellerAccountCache).toHaveBeenCalledWith("seller-4", account);
  });

  it("throws when account id is invalid in payAccount", async () => {
    await expect(payAccount("bad", true)).rejects.toMatchObject({
      status: 400,
      message: "Invalid account id",
    });
  });
});
