import { Types } from "mongoose";

import type { AuthenticatedRequest } from "../../src/middleware/auth";
import {
  addAccount,
  disableAccount,
  editAccount,
  getAccount,
  getAccounts,
  login,
  removeAccount,
  renewAccount,
  revokeSub,
} from "../../src/services/MarzbanService";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: {
    GetMarzbanURL: jest.fn(),
    GetSellerAdminUsername: jest.fn(),
    GetSellerAdminPassword: jest.fn(),
    GetMarzbanUsername: jest.fn(),
    GetMarzbanPassword: jest.fn(),
    GetSubscriptionURL: jest.fn(),
    GetDeletePaidAndRemovedUsers: jest.fn(),
    GetAllUsersForAgent: jest.fn(),
  },
}));

jest.mock("../../src/services/account/AccountHelpers", () => ({
  __esModule: true,
  default: {
    LoginToMarzban: jest.fn(),
    GetTotalUnpaid: jest.fn(),
    GetAccountsSmart: jest.fn(),
    NormalizeAccountOutput: jest.fn(),
    GetMarzbanAccounts: jest.fn(),
    GetMixedAccount: jest.fn(),
    GetUsernameAvailable: jest.fn(),
    GenerateProxiesAndInbounds: jest.fn(),
    GetMarzbanAccountByUsername: jest.fn(),
    UpsertSellerAccountCache: jest.fn(),
    UpsertMarzbanAccountCache: jest.fn(),
    PatchMarzbanAccountCache: jest.fn(),
    RemoveMarzbanAccountFromCache: jest.fn(),
    RemoveSellerAccountFromCache: jest.fn(),
    GetAccountSellerId: jest.fn(),
  },
}));

jest.mock("../../src/db/MongooseModel", () => ({
  __esModule: true,
  getModel: jest.fn(),
}));

jest.mock("../../src/services/auth/AuthService", () => ({
  __esModule: true,
  AuthService: {
    createSessionAndToken: jest.fn(),
  },
}));

jest.mock("../../src/services/security/PasswordService", () => ({
  __esModule: true,
  PasswordService: {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
    isBcryptHash: jest.fn(),
  },
}));

jest.mock("../../src/services/security/CryptoService", () => ({
  __esModule: true,
  CryptoService: {
    decrypt: jest.fn(),
  },
}));

jest.mock("../../src/db/MongooseDbManagement", () => ({
  __esModule: true,
  default: {
    checkLicense: jest.fn().mockResolvedValue(true),
  },
}));

const axios = require("axios").default;
const ConfigFile = require("../../src/config/Config").default;
const AccountHelpers = require("../../src/services/account/AccountHelpers").default;
const { getModel } = require("../../src/db/MongooseModel");
const { AuthService } = require("../../src/services/auth/AuthService");
const { PasswordService } = require("../../src/services/security/PasswordService");
const { CryptoService } = require("../../src/services/security/CryptoService");
const MongooseDbManagement = require("../../src/db/MongooseDbManagement").default;

const makeAdminReq = (): AuthenticatedRequest =>
  ({
    user: { role: "admin", sellerId: null, sessionId: "session-1" },
    headers: { authorization: "token" },
  }) as AuthenticatedRequest;

describe("MarzbanService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ConfigFile.GetMarzbanURL.mockResolvedValue("http://marzban.test");
    ConfigFile.GetSellerAdminUsername.mockResolvedValue("admin");
    ConfigFile.GetSellerAdminPassword.mockResolvedValue("pass");
    ConfigFile.GetMarzbanUsername.mockResolvedValue("marz");
    ConfigFile.GetMarzbanPassword.mockResolvedValue("marzpass");
    ConfigFile.GetSubscriptionURL.mockResolvedValue("http://sub.test");
    ConfigFile.GetDeletePaidAndRemovedUsers.mockResolvedValue("No");
    ConfigFile.GetAllUsersForAgent.mockResolvedValue("No");
    AccountHelpers.LoginToMarzban.mockResolvedValue("token");
    AccountHelpers.GetTotalUnpaid.mockResolvedValue({ TotalPriceUnpaid: 0, TotalLimitUnpaid: 0 });
    AccountHelpers.GetAccountsSmart.mockResolvedValue([]);
    AccountHelpers.NormalizeAccountOutput.mockImplementation((account: unknown) => account);
    AccountHelpers.GetMarzbanAccounts.mockResolvedValue({ data: { users: [] } });
    AccountHelpers.GetMixedAccount.mockResolvedValue([]);
    AccountHelpers.GetUsernameAvailable.mockResolvedValue("user1");
    AccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({ proxies: {}, inbounds: {} });
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValue(null);
    AccountHelpers.UpsertSellerAccountCache.mockReturnValue(undefined);
    AccountHelpers.UpsertMarzbanAccountCache.mockReturnValue(undefined);
    AccountHelpers.PatchMarzbanAccountCache.mockReturnValue(undefined);
    AccountHelpers.GetAccountSellerId.mockReturnValue(undefined);
    AuthService.createSessionAndToken.mockResolvedValue({
      accessToken: "token",
      expiresAt: new Date(),
      session: { _id: new Types.ObjectId() },
    });
    PasswordService.verifyPassword.mockResolvedValue(true);
    PasswordService.isBcryptHash.mockReturnValue(true);
    PasswordService.hashPassword.mockResolvedValue("hashed");
    CryptoService.decrypt.mockResolvedValue("decoded");
    MongooseDbManagement.checkLicense.mockResolvedValue(true);
    axios.post.mockResolvedValue({ data: { ok: true } });
    axios.put.mockResolvedValue({ data: { ok: true } });
    axios.delete.mockResolvedValue({ data: { ok: true } });
  });

  it("throws when login credentials are missing", async () => {
    await expect(login("", "pass")).rejects.toMatchObject({
      status: 400,
      message: "Username and password are required",
    });
  });

  it("uses explicit authorization in getAccounts", async () => {
    AccountHelpers.GetAccountsSmart.mockResolvedValue([{ id: "1" }]);
    AccountHelpers.NormalizeAccountOutput.mockReturnValue({ id: "1" });

    const result = await getAccounts({
      authReq: makeAdminReq(),
      sellerParam: "Seller",
      isAllParam: "false",
      authorization: "explicit",
    });

    expect(AccountHelpers.GetAccountsSmart).toHaveBeenCalledWith(
      "explicit",
      false,
      "Seller",
      "http://sub.test",
      true,
    );
    expect(result).toEqual([{ id: "1" }]);
  });

  it("uses request authorization in getAccounts when explicit token is missing", async () => {
    AccountHelpers.GetAccountsSmart.mockResolvedValue([{ id: "1" }]);
    AccountHelpers.NormalizeAccountOutput.mockReturnValue({ id: "1" });

    await getAccounts({
      authReq: makeAdminReq(),
      sellerParam: "Seller",
      isAllParam: "false",
    });

    expect(AccountHelpers.GetAccountsSmart).toHaveBeenCalledWith(
      "token",
      false,
      "Seller",
      "http://sub.test",
      true,
    );
  });

  it("uses explicit authorization in getAccount", async () => {
    const AccountModel = { find: jest.fn().mockResolvedValue([]) };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);
    AccountHelpers.GetMarzbanAccounts.mockResolvedValueOnce({ data: { users: [] } });
    AccountHelpers.GetMixedAccount.mockResolvedValueOnce([{ username: "u1" }]);
    AccountHelpers.NormalizeAccountOutput.mockImplementation((account: unknown) => account);

    const result = await getAccount({
      authReq: makeAdminReq(),
      search: "u1",
      sellerParam: "Seller",
      authorization: "explicit",
    });

    expect(AccountHelpers.GetMarzbanAccounts).toHaveBeenCalledWith("explicit", undefined, "u1");
    expect(result).toEqual([{ username: "u1" }]);
  });

  it("uses request authorization in getAccount when explicit token is missing", async () => {
    const AccountModel = { find: jest.fn().mockResolvedValue([]) };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);
    AccountHelpers.GetMarzbanAccounts.mockResolvedValueOnce({ data: { users: [] } });
    AccountHelpers.GetMixedAccount.mockResolvedValueOnce([{ username: "u2" }]);
    AccountHelpers.NormalizeAccountOutput.mockImplementation((account: unknown) => account);

    const result = await getAccount({
      authReq: makeAdminReq(),
      search: "u2",
      sellerParam: "Seller",
    });

    expect(AccountHelpers.GetMarzbanAccounts).toHaveBeenCalledWith("token", undefined, "u2");
    expect(result).toEqual([{ username: "u2" }]);
  });

  it("rejects addAccount when sellerId is invalid", async () => {
    const sellerModel = { findById: jest.fn(), findOne: jest.fn() };
    const tariffModel = { findOne: jest.fn() };
    const AccountModel = function () {
      return { save: jest.fn() } as { save: jest.Mock };
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(sellerModel)
      .mockResolvedValueOnce(tariffModel)
      .mockResolvedValueOnce(AccountModel);

    const tariffId = new Types.ObjectId().toString();
    await expect(
      addAccount({
        authReq: makeAdminReq(),
        body: { username: "u", note: "n", tariffId, onhold: false, sellerId: "bad" },
      }),
    ).rejects.toMatchObject({ status: 400, message: "Invalid sellerId" });
  });

  it("rolls back Marzban account when database save fails", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId().toString();
    const sellerSave = jest.fn().mockRejectedValue(new Error("save fail"));
    const seller = { _id: new Types.ObjectId(sellerId), Title: "Seller", save: sellerSave };
    const sellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const tariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(tariffId), Title: "Tariff" }),
    };
    const accountInstance = {
      save: jest.fn().mockResolvedValue(undefined),
      _id: new Types.ObjectId(),
    };
    const AccountModel = Object.assign(
      function () {
        return accountInstance;
      },
      { deleteOne: jest.fn().mockRejectedValue(new Error("delete fail")) },
    );
    (getModel as jest.Mock)
      .mockResolvedValueOnce(sellerModel)
      .mockResolvedValueOnce(tariffModel)
      .mockResolvedValueOnce(AccountModel);
    axios.delete.mockRejectedValueOnce(new Error("delete marzban fail"));

    await expect(
      addAccount({
        authReq: makeAdminReq(),
        body: { username: "u", note: "n", tariffId, onhold: false, sellerId },
      }),
    ).rejects.toThrow("save fail");

    expect(AccountModel.deleteOne).toHaveBeenCalled();
    expect(axios.delete).toHaveBeenCalled();
  });

  it("skips account cleanup when initial save fails", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId().toString();
    const seller = { _id: new Types.ObjectId(sellerId), Title: "Seller", save: jest.fn() };
    const sellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const tariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(tariffId), Title: "Tariff" }),
    };
    const accountInstance = { save: jest.fn().mockRejectedValue(new Error("save fail")) };
    const AccountModel = Object.assign(
      function () {
        return accountInstance;
      },
      { deleteOne: jest.fn() },
    );
    (getModel as jest.Mock)
      .mockResolvedValueOnce(sellerModel)
      .mockResolvedValueOnce(tariffModel)
      .mockResolvedValueOnce(AccountModel);

    await expect(
      addAccount({
        authReq: makeAdminReq(),
        body: { username: "u", note: "n", tariffId, onhold: false, sellerId },
      }),
    ).rejects.toThrow("save fail");

    expect(AccountModel.deleteOne).not.toHaveBeenCalled();
  });

  it("logs and continues when Marzban cache patch fails after addAccount", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId().toString();
    const seller = { _id: new Types.ObjectId(sellerId), Title: "Seller", save: jest.fn() };
    const sellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const tariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(tariffId), Title: "Tariff" }),
    };
    const accountInstance = {
      save: jest.fn().mockResolvedValue(undefined),
      _id: new Types.ObjectId(),
    };
    const AccountModel = function () {
      return accountInstance;
    };
    AccountHelpers.GetMarzbanAccountByUsername.mockRejectedValueOnce(new Error("cache fail"));
    (getModel as jest.Mock)
      .mockResolvedValueOnce(sellerModel)
      .mockResolvedValueOnce(tariffModel)
      .mockResolvedValueOnce(AccountModel);

    const result = await addAccount({
      authReq: makeAdminReq(),
      body: { username: "u", note: "n", tariffId, onhold: false, sellerId },
    });

    expect(result).toEqual({ ok: true });
  });

  it("skips cache update when Marzban account is missing after addAccount", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId().toString();
    const seller = { _id: new Types.ObjectId(sellerId), Title: "Seller", save: jest.fn() };
    const sellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const tariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(tariffId), Title: "Tariff" }),
    };
    const accountInstance = {
      save: jest.fn().mockResolvedValue(undefined),
      _id: new Types.ObjectId(),
    };
    const AccountModel = function () {
      return accountInstance;
    };
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null);
    (getModel as jest.Mock)
      .mockResolvedValueOnce(sellerModel)
      .mockResolvedValueOnce(tariffModel)
      .mockResolvedValueOnce(AccountModel);

    await addAccount({
      authReq: makeAdminReq(),
      body: { username: "u", note: "n", tariffId, onhold: false, sellerId },
    });

    expect(AccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
  });

  it("logs when editAccount Marzban cache patch fails", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());
    AccountHelpers.GetMarzbanAccountByUsername.mockRejectedValueOnce(new Error("patch fail"));

    const result = await editAccount({
      username: "u1",
      status: "disabled",
      authorization: "token",
    });

    expect(result).toEqual({ ok: true });
  });

  it("skips cache update when editAccount finds no Marzban account", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null);

    const result = await editAccount({
      username: "u1",
      status: "disabled",
      authorization: "token",
    });

    expect(result).toEqual({ ok: true });
    expect(AccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
  });

  it("uses request authorization when editAccount has no explicit token", async () => {
    const AccountModel = { findOne: jest.fn().mockResolvedValue(null) };
    const SellerModel = { findOne: jest.fn() };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    axios.put.mockResolvedValue({ data: { ok: true } });

    const result = await editAccount({
      authReq: makeAdminReq(),
      username: "u1",
      status: "disabled",
    });

    expect(result).toEqual({ ok: true });
    expect(axios.put).toHaveBeenCalledWith(
      "http://marzban.test/api/user/u1",
      { status: "disabled" },
      { headers: { Authorization: "token" } },
    );
  });

  it("uses request authorization when disableAccount has no explicit token", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());

    await disableAccount({
      authReq: makeAdminReq(),
      username: "u1",
      status: "disabled",
    });

    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      { status: "disabled" },
      { headers: { Authorization: "token" } },
    );
  });

  it("rejects renewAccount when sellerId is invalid", async () => {
    const AccountModel = function () {
      return { save: jest.fn() };
    };
    const SellerModel = { findById: jest.fn(), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);

    await expect(
      renewAccount({
        authReq: makeAdminReq(),
        body: { tariffId: new Types.ObjectId().toString(), username: "u1", sellerId: "bad" },
      }),
    ).rejects.toMatchObject({ status: 400, message: "Invalid sellerId" });
  });

  it("continues when capturing previous Marzban state fails", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockResolvedValue(undefined) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockRejectedValueOnce(
      new Error("capture fail"),
    ).mockResolvedValueOnce({ username: "u1" });

    const result = await renewAccount({
      authReq: makeAdminReq(),
      body: {
        tariffId: new Types.ObjectId().toString(),
        username: "u1",
        sellerId: sellerId.toString(),
      },
    });

    expect(result).toEqual({ ok: true });
  });

  it("rolls back Marzban updates when renewAccount save fails", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockRejectedValue(new Error("save fail")) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce({
      username: "u1",
      expire: 1,
      data_limit: 10,
    });
    axios.put
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockRejectedValueOnce(new Error("rollback fail"));
    axios.post.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("rollback reset fail"));

    await expect(
      renewAccount({
        authReq: makeAdminReq(),
        body: {
          tariffId: new Types.ObjectId().toString(),
          username: "u1",
          sellerId: sellerId.toString(),
        },
      }),
    ).rejects.toThrow("save fail");
  });

  it("skips rollback when no previous Marzban state exists", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockRejectedValue(new Error("save fail")) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null);

    await expect(
      renewAccount({
        authReq: makeAdminReq(),
        body: {
          tariffId: new Types.ObjectId().toString(),
          username: "u1",
          sellerId: sellerId.toString(),
        },
      }),
    ).rejects.toThrow("save fail");
  });

  it("executes rollback when save fails and explicit authorization is provided", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockRejectedValue(new Error("save fail")) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce({
      username: "u1",
      expire: 1,
      data_limit: 10,
    });
    axios.put.mockResolvedValue({ data: { ok: true } });
    axios.post.mockResolvedValue({ data: { ok: true } });

    await expect(
      renewAccount({
        authReq: makeAdminReq(),
        authorization: "explicit",
        body: {
          tariffId: new Types.ObjectId().toString(),
          username: "u1",
          sellerId: sellerId.toString(),
        },
      }),
    ).rejects.toThrow("save fail");

    expect(axios.post).toHaveBeenCalled();
  });

  it("executes rollback using request authorization when explicit token is missing", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockRejectedValue(new Error("save fail")) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce({
      username: "u1",
      expire: 1,
      data_limit: 10,
    });
    axios.put.mockResolvedValue({ data: { ok: true } });
    axios.post.mockResolvedValue({ data: { ok: true } });

    await expect(
      renewAccount({
        authReq: makeAdminReq(),
        body: {
          tariffId: new Types.ObjectId().toString(),
          username: "u1",
          sellerId: sellerId.toString(),
        },
      }),
    ).rejects.toThrow("save fail");

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {},
      { headers: { Authorization: "token" } },
    );
  });

  it("logs when Marzban cache patch fails after renewAccount", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockResolvedValue(undefined) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null).mockRejectedValueOnce(
      new Error("patch fail"),
    );

    const result = await renewAccount({
      authReq: makeAdminReq(),
      body: {
        tariffId: new Types.ObjectId().toString(),
        username: "u1",
        sellerId: sellerId.toString(),
      },
    });

    expect(result).toEqual({ ok: true });
  });

  it("skips cache update when Marzban account is missing after renewAccount", async () => {
    const sellerId = new Types.ObjectId();
    const seller = { _id: sellerId, Title: "Seller" };
    const AccountModel = function () {
      return { save: jest.fn().mockResolvedValue(undefined) };
    };
    const SellerModel = { findById: jest.fn().mockResolvedValue(seller), findOne: jest.fn() };
    const TariffModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), Title: "Tariff" }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(TariffModel);
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null).mockResolvedValueOnce(
      null,
    );

    await renewAccount({
      authReq: makeAdminReq(),
      body: {
        tariffId: new Types.ObjectId().toString(),
        username: "u1",
        sellerId: sellerId.toString(),
      },
    });

    expect(AccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
  });

  it("uses explicit authorization when removing accounts", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account), deleteMany: jest.fn() };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());

    await removeAccount({ authReq: makeAdminReq(), username: "u1", authorization: "explicit" });

    expect(axios.delete).toHaveBeenCalledWith(expect.any(String), {
      headers: { Authorization: "explicit" },
    });
  });

  it("uses request authorization when removing accounts without explicit token", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account), deleteMany: jest.fn() };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());

    await removeAccount({ authReq: makeAdminReq(), username: "u1" });

    expect(axios.delete).toHaveBeenCalledWith(expect.any(String), {
      headers: { Authorization: "token" },
    });
  });

  it("logs when revokeSub cache patch fails", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());
    AccountHelpers.GetMarzbanAccountByUsername.mockRejectedValueOnce(new Error("patch fail"));

    await revokeSub({ authReq: makeAdminReq(), username: "u1", authorization: "token" });
  });

  it("uses request authorization when revokeSub has no explicit token", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null);

    await revokeSub({ authReq: makeAdminReq(), username: "u1" });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      {},
      {
        headers: { Authorization: "token" },
      },
    );
  });

  it("skips cache update when revokeSub finds no Marzban account", async () => {
    const sellerId = new Types.ObjectId();
    const account = { Username: "u1", Seller: sellerId };
    const AccountModel = { findOne: jest.fn().mockResolvedValue(account) };
    const SellerModel = {
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
    AccountHelpers.GetAccountSellerId.mockReturnValue(sellerId.toString());
    AccountHelpers.GetMarzbanAccountByUsername.mockResolvedValueOnce(null);

    await revokeSub({ authReq: makeAdminReq(), username: "u1", authorization: "explicit" });

    expect(AccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
  });
});
