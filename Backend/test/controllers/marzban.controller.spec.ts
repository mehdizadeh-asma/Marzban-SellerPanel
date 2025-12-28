/// <reference types="jest" />

import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../../src/middleware/auth";

const axios = require("axios");
const AccountHelpers = require("../../src/services/account/AccountHelpers").default;
const ConfigFile = require("../../src/config/Config").default;
const MongooseDbManagement = require("../../src/db/MongooseDbManagement").default;
const { AuthService } = require("../../src/services/auth/AuthService");
const { PasswordService } = require("../../src/services/security/PasswordService");
const { CryptoService } = require("../../src/services/security/CryptoService");
const { getModel } = require("../../src/db/MongooseModel");
const MarzbanController = require("../../src/controllers/MarzbanController").default;

axios.default = axios;

jest.mock("axios");
jest.mock("../../src/services/account/AccountHelpers");
jest.mock("../../src/config/Config");
jest.mock("../../src/db/MongooseDbManagement");
jest.mock("../../src/services/auth/AuthService");
jest.mock("../../src/services/security/PasswordService");
jest.mock("../../src/services/security/CryptoService");
jest.mock("../../src/db/MongooseModel");

const createReq = (overrides: Partial<AuthenticatedRequest> = {}) =>
  ({
    body: {},
    params: {},
    headers: {},
    ...overrides,
  }) as AuthenticatedRequest;

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

const createRes = (): MockResponse => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const mockedAccountHelpers = AccountHelpers as jest.Mocked<typeof AccountHelpers>;
const mockedConfig = ConfigFile as jest.Mocked<typeof ConfigFile>;
const mockedMongoose = MongooseDbManagement as jest.Mocked<typeof MongooseDbManagement>;
const mockedAuth = AuthService as jest.Mocked<typeof AuthService>;
const mockedPassword = PasswordService as jest.Mocked<typeof PasswordService>;
const mockedCrypto = CryptoService as jest.Mocked<typeof CryptoService>;
const mockedGetModel = getModel as jest.Mock;

describe("MarzbanController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
    (axios.get as jest.Mock) = (axios.get as jest.Mock) || jest.fn();
    (axios.post as jest.Mock) = jest.fn();
    (axios.put as jest.Mock) = jest.fn();
    (axios.delete as jest.Mock) = jest.fn();
    (AccountHelpers as Record<string, unknown>).GetMarzbanAccountsAndStoreSmart =
      AccountHelpers.GetMarzbanAccountsAndStoreSmart || jest.fn();
    (AccountHelpers as Record<string, unknown>).GetSellerAccounts =
      AccountHelpers.GetSellerAccounts || jest.fn();
    (AccountHelpers as Record<string, unknown>).GetMixedAccount =
      AccountHelpers.GetMixedAccount || jest.fn();
    (AccountHelpers as Record<string, unknown>).GetUsernameAvailable =
      AccountHelpers.GetUsernameAvailable || jest.fn();
    (AccountHelpers as Record<string, unknown>).GenerateProxiesAndInbounds =
      AccountHelpers.GenerateProxiesAndInbounds || jest.fn();
    (AccountHelpers as Record<string, unknown>).GetMarzbanAccounts =
      AccountHelpers.GetMarzbanAccounts || jest.fn();
    (AccountHelpers as Record<string, unknown>).InvalidateSellerAllCache =
      AccountHelpers.InvalidateSellerAllCache || jest.fn();
    (AccountHelpers as Record<string, unknown>).GetMarzbanAccountByUsername =
      AccountHelpers.GetMarzbanAccountByUsername || jest.fn();
    (AccountHelpers as Record<string, unknown>).UpsertMarzbanAccountCache =
      AccountHelpers.UpsertMarzbanAccountCache || jest.fn();
    (AccountHelpers as Record<string, unknown>).PatchMarzbanAccountCache =
      AccountHelpers.PatchMarzbanAccountCache || jest.fn();
    (AccountHelpers as Record<string, unknown>).RemoveMarzbanAccountFromCache =
      AccountHelpers.RemoveMarzbanAccountFromCache || jest.fn();
    (AccountHelpers as Record<string, unknown>).UpsertSellerAccountCache =
      AccountHelpers.UpsertSellerAccountCache || jest.fn();
    (AccountHelpers as Record<string, unknown>).RemoveSellerAccountFromCache =
      AccountHelpers.RemoveSellerAccountFromCache || jest.fn();
    mockedAccountHelpers.GetMarzbanAccountByUsername.mockResolvedValue({
      username: "cache-user",
      data_limit: 0,
      used_traffic: 0,
      expire: 0,
      status: "active",
      subscription_url: "",
      online_at: "",
      sub_updated_at: "",
      sub_last_user_agent: "",
      note: "",
    });
    mockedAccountHelpers.GetAccountSellerId.mockImplementation((account: { Seller?: unknown }) => {
      const seller = account?.Seller as
        | { _id?: { toString: () => string }; toString?: () => string }
        | string
        | undefined;
      if (!seller) return undefined;
      if (typeof seller === "string") return seller;
      if (seller._id && typeof seller._id.toString === "function") return seller._id.toString();
      if (typeof seller.toString === "function") return seller.toString();
      return undefined;
    });
  });

  describe("Login", () => {
    it("returns 401 for admin with wrong password", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSellerAdminPassword.mockResolvedValue("Correct");

      const res = createRes();
      await MarzbanController.Login(
        createReq({ body: { username: "Admin", password: "wrong" } }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid Account Information",
        code: expect.any(String),
      });
    });

    it("logs in admin and returns auth payload", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSellerAdminPassword.mockResolvedValue("Pass");
      mockedConfig.GetMarzbanUsername.mockResolvedValue("mAdmin");
      mockedConfig.GetMarzbanPassword.mockResolvedValue("mPass");
      mockedAccountHelpers.LoginToMarzban.mockResolvedValue("marz-token");
      mockedAccountHelpers.GetTotalUnpaid.mockResolvedValue({
        TotalPriceUnpaid: 10,
        TotalLimitUnpaid: 100,
      });
      mockedAuth.createSessionAndToken.mockResolvedValue({
        accessToken: "jwt",
        expiresAt: new Date(),
        session: {},
      });

      const req = createReq({
        body: { username: "Admin", password: "Pass" },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.Login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          Username: "Admin",
          accessToken: "jwt",
          IsAdmin: true,
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when seller credentials invalid", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      const sellerDoc = { Username: "user1", Password: "hash", Status: "Active", _id: "id" };
      mockedGetModel.mockResolvedValueOnce({
        findOne: jest.fn().mockResolvedValue(sellerDoc),
      });
      mockedPassword.verifyPassword.mockResolvedValue(false);

      const req = createReq({ body: { username: "user1", password: "bad" } });
      const res = createRes();
      await MarzbanController.Login(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid Account Information",
        code: expect.any(String),
      });
    });

    it("calls next when admin login throws", async () => {
      const err = new Error("admin login failed");
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSellerAdminPassword.mockResolvedValue("Pass");
      mockedConfig.GetMarzbanUsername.mockResolvedValue("mAdmin");
      mockedConfig.GetMarzbanPassword.mockResolvedValue("mPass");
      mockedAccountHelpers.LoginToMarzban.mockRejectedValue(err);
      const req = createReq({ body: { username: "Admin", password: "Pass" } });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.Login(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });

    it("returns 400 when admin seller identifier is missing in GetAccounts", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("");
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "", isall: "false" },
      });
      const res = createRes();
      await MarzbanController.GetAccounts(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller identifier is required",
        code: expect.any(String),
      });
    });

    it("logs in seller, rehashes password, and decrypts marzban password", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSellerAdminPassword.mockResolvedValue("admin-pass");
      const sellerDoc = {
        _id: "seller-id",
        Username: "seller1",
        Password: "plain",
        MarzbanPassword: "enc-pass",
        MarzbanUsername: "m-user",
        Status: "Active",
        Title: "Seller One",
        Limit: 25,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockedGetModel.mockResolvedValueOnce({
        findOne: jest.fn().mockResolvedValue(sellerDoc),
      });
      mockedPassword.verifyPassword.mockResolvedValue(true);
      mockedPassword.isBcryptHash.mockReturnValue(false);
      mockedPassword.hashPassword.mockResolvedValue("hashed");
      mockedCrypto.decrypt.mockResolvedValue("marz-pass");
      mockedAccountHelpers.LoginToMarzban.mockResolvedValue("seller-token");
      mockedAccountHelpers.GetTotalUnpaid.mockResolvedValue({
        TotalPriceUnpaid: 5,
        TotalLimitUnpaid: 0,
      });
      mockedAuth.createSessionAndToken.mockResolvedValue({
        accessToken: "jwt",
        expiresAt: new Date(),
        session: {},
      });

      const req = createReq({ body: { username: "seller1", password: "secret" } });
      const res = createRes();

      await MarzbanController.Login(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedPassword.hashPassword).toHaveBeenCalledWith("secret");
      expect(sellerDoc.save).toHaveBeenCalled();
      expect(mockedCrypto.decrypt).toHaveBeenCalledWith("enc-pass");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ Username: "Seller One", IsAdmin: false }),
      );
    });

    it("removes paid users on Friday when configured", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2024-03-01T10:00:00Z"));
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSellerAdminPassword.mockResolvedValue("admin-pass");
      mockedConfig.GetDeletePaidAndRemovedUsers.mockResolvedValue("Yes");
      const sellerDoc = {
        _id: "seller-id",
        Username: "seller1",
        Password: "hash",
        MarzbanPassword: "enc-pass",
        MarzbanUsername: "m-user",
        Status: "Active",
        Title: "Seller One",
        Limit: 25,
      };
      mockedGetModel.mockResolvedValue({
        findOne: jest.fn().mockResolvedValue(sellerDoc),
      });
      mockedPassword.verifyPassword.mockResolvedValue(true);
      mockedPassword.isBcryptHash.mockReturnValue(true);
      mockedCrypto.decrypt.mockResolvedValue("marz-pass");
      mockedAccountHelpers.LoginToMarzban.mockResolvedValue("seller-token");
      mockedAccountHelpers.RemoveDeletedAccountSeller.mockResolvedValue(undefined);
      mockedAccountHelpers.GetTotalUnpaid.mockResolvedValue({
        TotalPriceUnpaid: 0,
        TotalLimitUnpaid: 0,
      });
      mockedAuth.createSessionAndToken.mockResolvedValue({
        accessToken: "jwt",
        expiresAt: new Date(),
        session: {},
      });

      const res = createRes();
      await MarzbanController.Login(
        createReq({ body: { username: "seller1", password: "secret" } }),
        res,
        jest.fn(),
      );

      expect(mockedAccountHelpers.RemoveDeletedAccountSeller).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("calls next when seller decrypt fails", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      const sellerDoc = {
        _id: "seller-id",
        Username: "seller1",
        Password: "hash",
        MarzbanPassword: "enc-pass",
        MarzbanUsername: "m-user",
        Status: "Active",
      };
      mockedGetModel.mockResolvedValue({
        findOne: jest.fn().mockResolvedValue(sellerDoc),
      });
      mockedPassword.verifyPassword.mockResolvedValue(true);
      mockedPassword.isBcryptHash.mockReturnValue(true);
      const err = new Error("decrypt fail");
      mockedCrypto.decrypt.mockRejectedValue(err);
      const next = jest.fn();

      await MarzbanController.Login(
        createReq({ body: { username: "seller1", password: "secret" } }),
        createRes(),
        next,
      );

      expect(next).toHaveBeenCalledWith(err);
    });

    it("calls next from outer catch when config fails", async () => {
      const err = new Error("config fail");
      mockedConfig.GetSellerAdminUsername.mockRejectedValue(err);
      const next = jest.fn();

      await MarzbanController.Login(
        createReq({ body: { username: "any", password: "any" } }),
        createRes(),
        next,
      );

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("GetAccounts", () => {
    it("returns 403 when seller session context missing", async () => {
      const req = createReq({
        user: { role: "seller", sellerId: "123", sessionId: "sid" },
        headers: {},
        params: { seller: "" },
      });
      const res = createRes();
      const next = jest.fn();
      mockedGetModel.mockResolvedValueOnce({
        findById: jest.fn().mockResolvedValue(null),
        find: jest.fn(),
      });

      await MarzbanController.GetAccounts(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns accounts for admin path", async () => {
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "S1", isall: "true" },
      });
      const res = createRes();
      mockedGetModel.mockResolvedValueOnce({
        find: jest.fn().mockResolvedValue([{ Title: "S1" }]),
      });
      jest
        .spyOn(AccountHelpers, "GetMarzbanAccountsAndStoreSmart")
        .mockResolvedValue({ failed: false, users: [] });
      jest.spyOn(AccountHelpers, "GetSellerAccounts").mockResolvedValue([]);
      jest.spyOn(AccountHelpers, "GetMixedAccount").mockResolvedValue([{ id: "x" }]);

      await MarzbanController.GetAccounts(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("uses admin default seller identifier when param missing", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      mockedConfig.GetSubscriptionURL.mockResolvedValue("sub");
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "", isall: "false" },
      });
      const res = createRes();
      jest.spyOn(AccountHelpers, "GetAccountsSmart").mockResolvedValue([]);

      await MarzbanController.GetAccounts(req, res, jest.fn());
      expect(AccountHelpers.GetAccountsSmart).toHaveBeenCalledWith(
        "auth",
        false,
        "Admin",
        "sub",
        true,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("calls next when GetAccountsSmart throws", async () => {
      const err = new Error("boom");
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("Admin");
      jest.spyOn(AccountHelpers, "GetAccountsSmart").mockRejectedValue(err);
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "", isall: "true" },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.GetAccounts(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });

    it("returns accounts for seller path with session seller", async () => {
      mockedConfig.GetSubscriptionURL.mockResolvedValue("sub");
      const sellerDoc = { _id: "507f1f77bcf86cd799439055", Title: "Seller Title" };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      mockedGetModel.mockResolvedValueOnce(SellerModel);
      jest.spyOn(AccountHelpers, "GetAccountsSmart").mockResolvedValue([]);

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id.toString(), sessionId: "sid" },
        headers: { authorization: "auth" },
        params: { seller: "", isall: "false" },
      });
      const res = createRes();

      await MarzbanController.GetAccounts(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(AccountHelpers.GetAccountsSmart).toHaveBeenCalledWith(
        "auth",
        false,
        "Seller Title",
        "sub",
        false,
      );
    });
  });

  describe("AddAccount", () => {
    it("returns 403 when license check fails", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(false);
      const req = createReq({ body: { tariffId: "1", accountPrefix: "u" } });
      const res = createRes();
      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "License is not available or expired",
        code: expect.any(String),
      });
    });

    it("returns 400 when TariffId missing", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const req = createReq({
        headers: {},
        body: { username: "user", note: "", tariffId: "", onhold: false },
      });
      const res = createRes();
      await MarzbanController.AddAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "TariffId is required and must be valid",
        code: expect.any(String),
      });
    });

    it("creates account for seller session", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = {
        _id: "0000000000000000000000a0",
        Title: "Seller One",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(sellerDoc),
      };
      const tariffId = "0000000000000000000000b1";
      const tariffDoc = { _id: tariffId, Title: "T1", Duration: 30, DataLimit: 5 };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue(tariffDoc),
      };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountModel = jest.fn().mockImplementation(() => ({ save: accountSave }));

      mockedGetModel
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce({ findById: jest.fn().mockResolvedValue(sellerDoc) });

      mockedAccountHelpers.GetUsernameAvailable.mockResolvedValue("seller001");
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        proxies: { vless: {} },
        inbounds: {},
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      const req = createReq({
        user: { role: "seller", sellerId: "0000000000000000000000a0", sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId,
          note: "",
          onhold: false,
          accountPrefix: "user",
        },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.AddAccount(req, res, next);
      if (next.mock.calls.length > 0) {
        throw next.mock.calls[0][0];
      }

      expect(res.status).toHaveBeenCalledWith(200);
      expect(accountSave).toHaveBeenCalled();
      expect(sellerDoc.save).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ username: "seller001" }),
        expect.any(Object),
      );
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller One",
        expect.any(Object),
      );
    });

    it("returns 404 when admin seller not found", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const TariffModel = { findOne: jest.fn() };
      const AccountModel = jest.fn();
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: "507f1f77bcf86cd799439011" },
        headers: { authorization: "Bearer token" },
        body: {
          username: "admin_user",
          tariffId: "0000000000000000000000c1",
          onhold: false,
          accountPrefix: "adm",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller not Found",
        code: expect.any(String),
      });
    });

    it("returns 404 when admin selector title is missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(null),
        findOne: jest.fn(),
      };
      const TariffModel = { findOne: jest.fn() };
      const AccountModel = jest.fn();
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId: "0000000000000000000000c2",
          onhold: false,
          accountPrefix: "user",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(SellerModel.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller not Found",
        code: expect.any(String),
      });
    });

    it("returns 403 when seller session not found", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const SellerModel = { findById: jest.fn().mockResolvedValue(null) };
      const TariffModel = { findOne: jest.fn() };
      const AccountModel = jest.fn();
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId: "0000000000000000000000d1",
          onhold: false,
          accountPrefix: "seller",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller context not found for current session",
        code: expect.any(String),
      });
    });

    it("returns 400 when account username prefix is missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = { _id: "507f1f77bcf86cd799439011", Title: "Seller" };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(sellerDoc),
      };
      const TariffModel = { findOne: jest.fn() };
      const AccountModel = jest.fn();
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId: "0000000000000000000000d1",
          onhold: false,
          accountPrefix: "   ",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account username prefix is required",
        code: expect.any(String),
      });
    });

    it("returns 404 when tariff not found", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = { _id: "507f1f77bcf86cd799439011", Title: "Seller" };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(sellerDoc),
      };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(null) };
      const AccountModel = jest.fn();
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId: "0000000000000000000000d1",
          onhold: false,
          accountPrefix: "user",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tariff not Found",
        code: expect.any(String),
      });
    });

    it("creates on-hold account and sets expected fields", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = {
        _id: "507f1f77bcf86cd799439011",
        Title: "Seller Hold",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      const tariffId = "0000000000000000000000d2";
      const tariffDoc = { _id: tariffId, Title: "Hold", Duration: 30, DataLimit: 2 };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountModel = jest.fn().mockImplementation(() => ({ save: accountSave }));
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        if (name === "Account") return AccountModel;
        throw new Error("unexpected model " + name);
      });

      mockedAccountHelpers.GetUsernameAvailable.mockResolvedValue("sellerhold");
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        proxies: {},
        inbounds: {},
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { created: true } });

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId,
          note: "",
          onhold: true,
          accountPrefix: "hold",
        },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.AddAccount(req, res, next);
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          username: "sellerhold",
          on_hold_expire_duration: expect.any(Number),
          on_hold_timeout: expect.any(Date),
          status: "on_hold",
          data_limit: expect.any(Number),
        }),
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller Hold",
        expect.any(Object),
      );
    });

    it("creates account using accountUsername when accountPrefix missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = {
        _id: "507f1f77bcf86cd799439011",
        Title: "Seller User",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      const tariffId = "0000000000000000000000d3";
      const tariffDoc = { _id: tariffId, Title: "Zero", Duration: 0, DataLimit: 0 };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountModel = jest.fn().mockImplementation(() => ({ save: accountSave }));

      mockedGetModel
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce({ findById: jest.fn().mockResolvedValue(sellerDoc) });

      mockedAccountHelpers.GetUsernameAvailable.mockResolvedValue("accountuser001");
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        proxies: {},
        inbounds: {},
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { created: true } });

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId,
          note: "",
          onhold: false,
          accountUsername: "accountuser",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ username: "accountuser001" }),
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("creates account using username when prefix fields are missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerDoc = {
        _id: "507f1f77bcf86cd799439012",
        Title: "Seller UserName",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      const tariffId = "0000000000000000000000d4";
      const tariffDoc = { _id: tariffId, Title: "Basic", Duration: 1, DataLimit: 1 };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountModel = jest.fn().mockImplementation(() => ({ save: accountSave }));

      mockedGetModel
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce({ findById: jest.fn().mockResolvedValue(sellerDoc) });

      mockedAccountHelpers.GetUsernameAvailable.mockResolvedValue("username001");
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        proxies: {},
        inbounds: {},
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { created: true } });

      const req = createReq({
        user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: {
          tariffId,
          note: "",
          onhold: false,
          username: "username",
        },
      });
      const res = createRes();

      await MarzbanController.AddAccount(req, res, jest.fn());

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ username: "username001" }),
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("creates account for admin using sellerId lookup", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const sellerId = "507f1f77bcf86cd799439041";
      const sellerDoc = {
        _id: sellerId,
        Title: "Admin Seller",
        save: jest.fn().mockResolvedValue(undefined),
      };
      const tariffId = "507f1f77bcf86cd799439042";
      const tariffDoc = { _id: tariffId, Title: "Tariff", Duration: 1, DataLimit: 1 };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc), findOne: jest.fn() };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      const AccountModel = jest.fn().mockImplementation(() => ({ save: accountSave }));
      mockedGetModel
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(AccountModel);
      mockedAccountHelpers.GetUsernameAvailable.mockResolvedValue("admin001");
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        proxies: {},
        inbounds: {},
      });
      (axios.post as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        body: { tariffId, onhold: false, sellerId, accountPrefix: "user" },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.AddAccount(req, res, next);
      if (next.mock.calls.length) throw next.mock.calls[0][0];

      expect(SellerModel.findById).toHaveBeenCalledWith(sellerId);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("EditAccount", () => {
    it("returns 404 when username missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const req = createReq({
        params: { username: "" },
        body: { status: "active" },
      });
      const res = createRes();

      await MarzbanController.EditAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username not Found",
        code: expect.any(String),
      });
    });

    it("edits account and invalidates cache", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      const accountDoc = { Seller: { _id: "507f1f77bcf86cd799439011" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel = { findOne: jest.fn().mockResolvedValue({ Title: "Seller Edit" }) };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);

      const req = createReq({
        params: { username: "user123" },
        body: { status: "disabled" },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.EditAccount(req, res, next);
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller Edit",
        expect.any(Object),
      );
    });

    it("edits account when seller not found and skips cache invalidation", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      const AccountModel = { findOne: jest.fn().mockResolvedValue(null) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);

      const req = createReq({
        params: { username: "user123" },
        body: { status: "disabled" },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();

      await MarzbanController.EditAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
    });

    it("calls next when edit account fails", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const err = new Error("put failed");
      (axios.put as jest.Mock).mockRejectedValue(err);
      const req = createReq({
        params: { username: "user123" },
        body: { status: "disabled" },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();
      const next = jest.fn();

      await MarzbanController.EditAccount(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("GetAccount", () => {
    it("returns normalized account list for admin", async () => {
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "Admin", search: "" },
      });
      const res = createRes();
      jest.spyOn(AccountHelpers, "GetMarzbanAccounts").mockResolvedValue({ data: { users: [] } });
      const AccountModel = { find: jest.fn().mockResolvedValue([]) };
      mockedGetModel.mockResolvedValueOnce(AccountModel);
      jest.spyOn(AccountHelpers, "GetMixedAccount").mockResolvedValue([{ id: "mix" }]);

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it("returns 403 when seller context missing", async () => {
      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        headers: { authorization: "auth" },
        params: { seller: "", search: "" },
      });
      const res = createRes();
      mockedGetModel.mockResolvedValueOnce({
        findById: jest.fn().mockResolvedValue(null),
      });

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 when admin seller identifier missing", async () => {
      mockedConfig.GetSellerAdminUsername.mockResolvedValue("");
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "", search: "" },
      });
      const res = createRes();

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns accounts for seller path", async () => {
      const sellerDoc = { _id: new Types.ObjectId(), Title: "Seller A" };
      const req = createReq({
        user: { role: "seller", sessionId: "sid", sellerId: sellerDoc._id.toString() },
        headers: { authorization: "auth" },
        params: { seller: "", search: "" },
      });
      const res = createRes();
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      const AccountModel = { find: jest.fn().mockResolvedValue([{ Username: "u1" }]) };
      mockedGetModel.mockResolvedValueOnce(SellerModel).mockResolvedValueOnce(AccountModel);
      jest.spyOn(AccountHelpers, "GetMarzbanAccounts").mockResolvedValue({ data: { users: [] } });
      jest.spyOn(AccountHelpers, "GetMixedAccount").mockResolvedValue([{ Username: "u1" }]);

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(AccountModel.find).toHaveBeenCalled();
    });

    it("calls next when fetching account list fails", async () => {
      const err = new Error("fail");
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "Admin", search: "" },
      });
      const res = createRes();
      jest.spyOn(AccountHelpers, "GetMarzbanAccounts").mockRejectedValue(err);
      const next = jest.fn();

      await MarzbanController.GetAccount(req, res, next);
      expect(next).toHaveBeenCalledWith(err);
    });

    it("returns empty list when marzban accounts payload missing users", async () => {
      const req = createReq({
        user: { role: "admin", sessionId: "sid", sellerId: null },
        headers: { authorization: "auth" },
        params: { seller: "Admin", search: "" },
      });
      const res = createRes();
      jest.spyOn(AccountHelpers, "GetMarzbanAccounts").mockResolvedValue({ data: {} });
      const AccountModel = { find: jest.fn().mockResolvedValue([]) };
      mockedGetModel.mockResolvedValueOnce(AccountModel);
      jest.spyOn(AccountHelpers, "GetMixedAccount").mockResolvedValue([]);

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 403 when user context missing entirely", async () => {
      const req = createReq({
        user: undefined,
        headers: { authorization: "auth" },
        params: { seller: "", search: "" },
      });
      const res = createRes();
      const AccountModel = { find: jest.fn().mockResolvedValue([]) };
      mockedGetModel.mockResolvedValueOnce(AccountModel);
      jest.spyOn(AccountHelpers, "GetMarzbanAccounts").mockResolvedValue({ data: { users: [] } });

      await MarzbanController.GetAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("RemoveAccount", () => {
    it("forbids seller deleting account of another seller", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439013", sessionId: "sid" },
        params: { username: "u1" },
        headers: { authorization: "auth" },
      });
      const res = createRes();
      const accountDoc = {
        Username: "u1",
        Seller: { toString: () => "507f1f77bcf86cd799439014" },
        Payed: false,
      };
      mockedGetModel
        .mockResolvedValueOnce({
          findOne: jest.fn().mockResolvedValue(accountDoc),
          deleteMany: jest.fn(),
        })
        .mockResolvedValueOnce({
          findOne: jest.fn(),
        })
        .mockResolvedValueOnce({
          findById: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439013" }),
        });
      (axios.delete as jest.Mock).mockResolvedValue({});

      await MarzbanController.RemoveAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 404 when account not found", async () => {
      const AccountModel = { findOne: jest.fn().mockResolvedValue(null) };
      mockedGetModel.mockResolvedValueOnce(AccountModel);
      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        params: { username: "missing" },
      });
      const res = createRes();

      await MarzbanController.RemoveAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls next when marzban delete fails with non-404", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "userfail", Seller: "507f1f77bcf86cd799439011", Payed: false };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue(accountDoc),
        deleteMany: jest.fn().mockResolvedValue({}),
      };
      const SellerModel = { findOne: jest.fn().mockResolvedValue({ Title: "Seller Rm" }) };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        params: { username: "userfail" },
      });
      const res = createRes();
      const next = jest.fn();
      (axios.delete as jest.Mock).mockRejectedValue({ response: { status: 500 } });

      await MarzbanController.RemoveAccount(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("ignores 404 from marzban delete and still removes account", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "user404", Seller: undefined, Payed: false };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue(accountDoc),
        deleteMany: jest.fn().mockResolvedValue({}),
      };
      const SellerModel = { findOne: jest.fn() };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        params: { username: "user404" },
      });
      const res = createRes();
      const next = jest.fn();
      (axios.delete as jest.Mock).mockRejectedValue({ response: { status: 404 } });

      await MarzbanController.RemoveAccount(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.RemoveMarzbanAccountFromCache).not.toHaveBeenCalled();
    });

    it("deletes account successfully for admin", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = {
        Username: "userok",
        Seller: { _id: "507f1f77bcf86cd799439012" },
        Payed: false,
      };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue(accountDoc),
        deleteMany: jest.fn().mockResolvedValue({}),
      };
      const SellerModel = {
        findOne: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439012", Title: "Seller Admin" }),
      };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        headers: { authorization: "Bearer token" },
        params: { username: "userok" },
      });
      const res = createRes();
      (axios.delete as jest.Mock).mockResolvedValue({});

      await MarzbanController.RemoveAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.RemoveSellerAccountFromCache).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439012",
        "userok",
      );
      expect(mockedAccountHelpers.RemoveMarzbanAccountFromCache).toHaveBeenCalledWith(
        "Seller Admin",
        "userok",
      );
    });

    it("returns 403 when seller session is missing on remove", async () => {
      const accountDoc = {
        Username: "u1",
        Seller: { _id: "507f1f77bcf86cd799439012" },
        Payed: false,
      };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue(accountDoc),
        deleteMany: jest.fn(),
      };
      const SellerModel = { findById: jest.fn().mockResolvedValue(null) };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") return SellerModel;
        throw new Error("unexpected model " + name);
      });
      const res = createRes();

      await MarzbanController.RemoveAccount(
        createReq({
          user: { role: "seller", sellerId: "507f1f77bcf86cd799439012", sessionId: "sid" },
          params: { username: "u1" },
        }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls next when remove account outer catch triggers", async () => {
      const err = new Error("outer");
      mockedGetModel.mockImplementation(() => {
        throw err;
      });
      const next = jest.fn();
      await MarzbanController.RemoveAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { username: "u1" },
        }),
        createRes(),
        next,
      );
      expect(next).toHaveBeenCalledWith(err);
    });

    it("allows seller to delete own account", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const sellerDoc = { _id: "507f1f77bcf86cd799439099", Title: "S Own" };
      const accountDoc = { Username: "u1", Seller: { _id: sellerDoc._id }, Payed: false };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue(accountDoc),
        deleteMany: jest.fn().mockResolvedValue({}),
      };
      const SellerModel = { findOne: jest.fn(), findById: jest.fn().mockResolvedValue(sellerDoc) };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") return SellerModel;
        throw new Error("unexpected model " + name);
      });
      (axios.delete as jest.Mock).mockResolvedValue({});

      const res = createRes();
      await MarzbanController.RemoveAccount(
        createReq({
          user: { role: "seller", sellerId: sellerDoc._id.toString(), sessionId: "sid" },
          params: { username: "u1" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.RemoveMarzbanAccountFromCache).toHaveBeenCalledWith(
        "S Own",
        "u1",
      );
    });
  });

  describe("DisableAccount", () => {
    it("allows seller to disable own account", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
        headers: { authorization: "Bearer token" },
      });
      const accountDoc = { Username: "u1", Seller: { _id: "507f1f77bcf86cd799439011" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerModelForSession = {
        findById: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Seller One" }),
      };

      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerModelForSession);

      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.DisableAccount(req, res, next);
      if (next.mock.calls.length > 0) {
        throw next.mock.calls[0][0];
      }

      expect(res.status).toHaveBeenCalledWith(200);
      expect(axios.put).toHaveBeenCalled();
      expect(mockedAccountHelpers.PatchMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller One",
        "u1",
        {
          status: "Disabled",
        },
      );
    });

    it("returns 404 when username missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "" },
        body: { status: "Disabled" },
      });
      const res = createRes();
      await MarzbanController.DisableAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when status missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "" },
      });
      const res = createRes();
      await MarzbanController.DisableAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when account not found", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const AccountModel = { findOne: jest.fn().mockResolvedValue(null) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerModelForSession = { findById: jest.fn() };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerModelForSession);

      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
      });
      const res = createRes();
      await MarzbanController.DisableAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when seller context missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: { _id: "507f1f77bcf86cd799439012" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerModelForSession = { findById: jest.fn().mockResolvedValue(null) };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerModelForSession);

      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
      });
      const res = createRes();
      await MarzbanController.DisableAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when seller tries to disable another seller account", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: { _id: "507f1f77bcf86cd799439014" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerModelForSession = {
        findById: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Seller One" }),
      };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerModelForSession);

      const req = createReq({
        user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
      });
      const res = createRes();
      await MarzbanController.DisableAccount(req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows admin to disable account", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: { _id: "507f1f77bcf86cd799439011" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel = {
        findOne: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Admin Seller" }),
      };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();
      const next = jest.fn();
      await MarzbanController.DisableAccount(req, res, next);
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.PatchMarzbanAccountCache).toHaveBeenCalledWith(
        "Admin Seller",
        "u1",
        {
          status: "Disabled",
        },
      );
    });

    it("allows admin to disable account even when seller is missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: undefined };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel = { findOne: jest.fn() };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        params: { username: "u1" },
        body: { status: "Disabled" },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();

      await MarzbanController.DisableAccount(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.PatchMarzbanAccountCache).not.toHaveBeenCalled();
    });

    it("calls next when disable account fails", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: { _id: "507f1f77bcf86cd799439011" } };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel = {
        findOne: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Seller One" }),
      };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      const err = new Error("put failed");
      (axios.put as jest.Mock).mockRejectedValue(err);
      const next = jest.fn();

      await MarzbanController.DisableAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { username: "u1" },
          body: { status: "Disabled" },
          headers: { authorization: "Bearer token" },
        }),
        createRes(),
        next,
      );

      expect(next).toHaveBeenCalledWith(err);
    });

    it("returns 403 when account seller undefined", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const accountDoc = { Username: "u1", Seller: undefined };
      const sellerSession = { _id: "507f1f77bcf86cd799439011", Title: "Seller One" };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerSessionModel = { findById: jest.fn().mockResolvedValue(sellerSession) };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") {
          if (!SellerModel.called) {
            SellerModel.called = true;
            return SellerModel;
          }
          return SellerSessionModel;
        }
        throw new Error("unexpected model " + name);
      });

      const res = createRes();
      await MarzbanController.DisableAccount(
        createReq({
          user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
          params: { username: "u1" },
          body: { status: "Disabled" },
        }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows seller when account seller is ObjectId", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const sellerId = new Types.ObjectId();
      const accountDoc = { Username: "u1", Seller: sellerId };
      const AccountModel = { findOne: jest.fn().mockResolvedValue(accountDoc) };
      const SellerModel: { findOne: jest.Mock; called?: boolean } = { findOne: jest.fn() };
      const SellerSessionModel = {
        findById: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller Obj" }),
      };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") {
          if (!SellerModel.called) {
            SellerModel.called = true;
            return SellerModel;
          }
          return SellerSessionModel;
        }
        throw new Error("unexpected model " + name);
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });

      const res = createRes();
      await MarzbanController.DisableAccount(
        createReq({
          user: { role: "seller", sellerId: sellerId.toString(), sessionId: "sid" },
          params: { username: "u1" },
          body: { status: "Disabled" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("RenewAccount", () => {
    it("returns 403 when license invalid", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(false);
      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({ body: { username: "u1", tariffId: "507f1f77bcf86cd799439011" } }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "License is not available or expired",
        code: expect.any(String),
      });
    });

    it("returns 404 when username missing", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = { exists: jest.fn(), findOne: jest.fn() };
      const SellerModel = { findById: jest.fn(), findOne: jest.fn() };
      const TariffModel = { findOne: jest.fn() };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel);

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({ body: { username: "", tariffId: "" } }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username not Found",
        code: expect.any(String),
      });
    });

    it("returns 404 when tariff not found", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = { exists: jest.fn(), findOne: jest.fn() };
      const SellerModel = { findById: jest.fn(), findOne: jest.fn() };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(null) };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel);

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({ body: { username: "user", tariffId: "507f1f77bcf86cd799439011" } }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tariff not Found",
        code: expect.any(String),
      });
    });

    it("returns 403 when seller session missing", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = { exists: jest.fn(), findOne: jest.fn() };
      const SellerModel = { findById: jest.fn().mockResolvedValue(null), findOne: jest.fn() };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439024",
          Duration: 1,
          DataLimit: 1,
        }),
      };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "seller", sellerId: "507f1f77bcf86cd799439020", sessionId: "sid" },
          body: { username: "user", tariffId: "507f1f77bcf86cd799439020" },
        }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when seller does not own account", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = { exists: jest.fn().mockResolvedValue(false), findOne: jest.fn() };
      const sellerDoc = { _id: "507f1f77bcf86cd799439020" };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc), findOne: jest.fn() };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439025",
          Duration: 1,
          DataLimit: 1,
        }),
      };
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModel;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "seller", sellerId: sellerDoc._id as string, sessionId: "sid" },
          body: { username: "user", tariffId: "507f1f77bcf86cd799439012" },
        }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("renews account for seller when ownership is confirmed", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const sellerId = "507f1f77bcf86cd799439021";
      const sellerDoc = { _id: sellerId, Title: "Seller Owned" };
      const tariffId = "507f1f77bcf86cd799439022";
      const tariffDoc = { _id: tariffId, Title: "T", Duration: 0, DataLimit: 0 };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountCtor = jest
        .fn()
        .mockImplementation(() => ({ save: accountSave })) as jest.Mock & { exists: jest.Mock };
      AccountCtor.exists = jest.fn().mockResolvedValue(true);
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc) };
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      mockedGetModel
        .mockResolvedValueOnce(AccountCtor)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(SellerModel);
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "seller", sellerId, sessionId: "sid" },
          body: { username: "user", tariffId },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(accountSave).toHaveBeenCalled();
    });

    it("returns 400 when tariffId missing", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = { exists: jest.fn(), findOne: jest.fn() };
      const SellerModel = { findById: jest.fn(), findOne: jest.fn() };
      const TariffModel = { findOne: jest.fn() };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel);

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({ body: { username: "user", tariffId: "" } }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "TariffId is required and must be valid",
        code: expect.any(String),
      });
    });

    it("admin selects seller by params.seller ObjectId", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const sellerId = "507f1f77bcf86cd799439030";
      const tariffId = "507f1f77bcf86cd799439031";
      const sellerDoc = { _id: sellerId, Title: "Params Seller" };
      const SellerModel = { findById: jest.fn().mockResolvedValue(sellerDoc), findOne: jest.fn() };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({ _id: tariffId, Title: "T", Duration: 1 }),
      };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountCtor = jest.fn().mockImplementation(() => ({ save: accountSave }));
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountCtor;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const req = createReq({
        user: { role: "admin", sellerId: null, sessionId: "sid" },
        params: { seller: sellerId },
        body: { username: "user", tariffId },
        headers: { authorization: "Bearer token" },
      });
      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(req, res, next);
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(SellerModel.findById).toHaveBeenCalledWith(sellerId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("admin selects seller by title when id invalid", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const tariffId = "507f1f77bcf86cd799439033";
      const sellerDoc = { _id: "507f1f77bcf86cd799439034", Title: "Title Seller" };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(sellerDoc),
      };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({ _id: tariffId, Title: "T", Duration: 1 }),
      };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountCtor = jest.fn().mockImplementation(() => ({ save: accountSave }));
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountCtor;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { seller: "title-seller" },
          body: { username: "user", tariffId, sellerTitle: "title-seller" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(SellerModel.findOne).toHaveBeenCalledWith({ Title: "title-seller" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("admin falls back to account seller ObjectId when not found", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const tariffId = "507f1f77bcf86cd799439037";
      const sellerObjectId = new Types.ObjectId();
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({ _id: tariffId, Title: "T", Duration: 1 }),
      };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue({ _id: sellerObjectId, Title: "Seller Obj" }),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountCtor = jest
        .fn()
        .mockImplementation(() => ({ save: accountSave })) as jest.Mock & { findOne: jest.Mock };
      AccountCtor.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({ Seller: sellerObjectId }),
      });
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountCtor;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          body: { username: "user", tariffId: tariffId },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(SellerModel.findById).toHaveBeenCalledWith(sellerObjectId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("admin falls back to account seller populated object", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const tariffId = "507f1f77bcf86cd799439077";
      const sellerObjectId = new Types.ObjectId();
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({ _id: tariffId, Title: "T", Duration: 1 }),
      };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue({ _id: sellerObjectId, Title: "Seller Obj" }),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountCtor = jest
        .fn()
        .mockImplementation(() => ({ save: accountSave })) as jest.Mock & { findOne: jest.Mock };
      AccountCtor.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({ Seller: { _id: sellerObjectId } }),
      });
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountCtor;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { ok: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          body: { username: "user", tariffId: tariffId },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(SellerModel.findById).toHaveBeenCalledWith(sellerObjectId);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when fallback account seller has no id", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const tariffId = "507f1f77bcf86cd799439078";
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({ _id: tariffId, Title: "Tariff", Duration: 1 }),
      };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const AccountModel = {
        findOne: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue({ Seller: {} }),
        }),
        exists: jest.fn(),
      };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(SellerModel);

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          body: { username: "user", tariffId },
          headers: { authorization: "Bearer token" },
        }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller not Found",
        code: expect.any(String),
      });
    });

    it("returns 404 when seller still not found after all lookups", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      const AccountModel = {
        findOne: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(null) }),
        exists: jest.fn(),
      };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const TariffModel = {
        findOne: jest.fn().mockResolvedValue({
          _id: "507f1f77bcf86cd799439040",
          Title: "Tariff",
          Duration: 1,
        }),
      };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(TariffModel)
        .mockResolvedValueOnce(SellerModel);

      const res = createRes();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          body: { username: "user", tariffId: "507f1f77bcf86cd799439040" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        jest.fn(),
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Seller not Found",
        code: expect.any(String),
      });
    });

    it("renews account using admin fallback account seller", async () => {
      mockedMongoose.checkLicense.mockResolvedValue(true);
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const tariffId = "507f1f77bcf86cd799439066";
      const tariffDoc = { _id: tariffId, Title: "Tariff", Duration: 2, DataLimit: 1 };
      const fallbackSellerId = new Types.ObjectId().toString();
      const TariffModel = { findOne: jest.fn().mockResolvedValue(tariffDoc) };
      const SellerModel = {
        findById: jest.fn().mockResolvedValue({ _id: fallbackSellerId, Title: "Seller Fallback" }),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const fallbackAccount = { Seller: { _id: fallbackSellerId } };
      const accountSave = jest.fn().mockResolvedValue(undefined);
      const AccountModelConstructor = jest
        .fn()
        .mockImplementation(() => ({ save: accountSave })) as jest.Mock & {
        findOne: jest.Mock;
      };
      AccountModelConstructor.findOne = jest
        .fn()
        .mockReturnValue({ sort: jest.fn().mockResolvedValue(fallbackAccount) });
      mockedGetModel.mockImplementation(async (name: string) => {
        if (name === "Account") return AccountModelConstructor;
        if (name === "Seller") return SellerModel;
        if (name === "Tariff") return TariffModel;
        throw new Error("unexpected model " + name);
      });
      mockedAccountHelpers.GenerateProxiesAndInbounds.mockResolvedValue({
        inbounds: {},
        proxies: {},
      });
      (axios.put as jest.Mock).mockResolvedValue({ data: { renewed: true } });
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RenewAccount(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          body: { username: "u1", tariffId: tariffId },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(accountSave).toHaveBeenCalled();
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller Fallback",
        expect.any(Object),
      );
    });
  });

  describe("RevokeSub", () => {
    it("returns 404 when username missing", async () => {
      const res = createRes();
      await MarzbanController.RevokeSub(createReq({ params: { username: "" } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when account not found", async () => {
      const AccountModel = { findOne: jest.fn().mockResolvedValue(null) };
      const SellerModel = { findOne: jest.fn() };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);

      const res = createRes();
      await MarzbanController.RevokeSub(createReq({ params: { username: "u1" } }), res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when seller does not own account", async () => {
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: { _id: "507f1f77bcf86cd799439014" } }),
      };
      const SellerModel = { findOne: jest.fn() };
      const sessionSeller = { _id: "507f1f77bcf86cd799439011" };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce({ findById: jest.fn().mockResolvedValue(sessionSeller) });

      const res = createRes();
      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "sid" },
          params: { username: "u1" },
        }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 403 when seller context missing", async () => {
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: { _id: "507f1f77bcf86cd799439012" } }),
      };
      const SellerModel = { findOne: jest.fn() };
      const SellerSessionModel = { findById: jest.fn().mockResolvedValue(null) };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerSessionModel);

      const res = createRes();
      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "seller", sellerId: "507f1f77bcf86cd799439012", sessionId: "sid" },
          params: { username: "u1" },
        }),
        res,
        jest.fn(),
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("revokes subscription for seller and invalidates cache", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const sellerDoc = { _id: "507f1f77bcf86cd799439011", Title: "Seller One" };
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: { _id: sellerDoc._id } }),
      };
      const SellerModel = { findOne: jest.fn(), findById: jest.fn().mockResolvedValue(sellerDoc) };
      mockedGetModel
        .mockResolvedValueOnce(AccountModel)
        .mockResolvedValueOnce(SellerModel)
        .mockResolvedValueOnce(SellerModel);
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "seller", sellerId: sellerDoc._id, sessionId: "sid" },
          params: { username: "u1" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Seller One",
        expect.any(Object),
      );
    });

    it("calls next when revoke sub fails", async () => {
      const err = new Error("revoke failed");
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: { _id: "507f1f77bcf86cd799439011" } }),
      };
      const SellerModel = {
        findOne: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Seller" }),
      };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      (axios.post as jest.Mock).mockRejectedValue(err);
      const next = jest.fn();

      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { username: "u1" },
          headers: { authorization: "Bearer token" },
        }),
        createRes(),
        next,
      );
      expect(next).toHaveBeenCalledWith(err);
    });

    it("revokes subscription for admin", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: { _id: "507f1f77bcf86cd799439011" } }),
      };
      const SellerModel = {
        findOne: jest
          .fn()
          .mockResolvedValue({ _id: "507f1f77bcf86cd799439011", Title: "Admin Seller" }),
      };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { username: "u1" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).toHaveBeenCalledWith(
        "Admin Seller",
        expect.any(Object),
      );
    });

    it("revokes subscription for admin even when seller is missing", async () => {
      mockedConfig.GetMarzbanURL.mockResolvedValue("http://marzban");
      const AccountModel = {
        findOne: jest.fn().mockResolvedValue({ Seller: undefined }),
      };
      const SellerModel = { findOne: jest.fn().mockResolvedValue(null) };
      mockedGetModel.mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(SellerModel);
      (axios.post as jest.Mock).mockResolvedValue({});

      const res = createRes();
      const next = jest.fn();
      await MarzbanController.RevokeSub(
        createReq({
          user: { role: "admin", sellerId: null, sessionId: "sid" },
          params: { username: "u1" },
          headers: { authorization: "Bearer token" },
        }),
        res,
        next,
      );
      if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedAccountHelpers.UpsertMarzbanAccountCache).not.toHaveBeenCalled();
    });
  });
});
