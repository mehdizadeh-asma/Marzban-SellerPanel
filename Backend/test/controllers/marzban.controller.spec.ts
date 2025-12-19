import type { Request } from "express";
import { mockConfigDefaults, mockNext, mockResponse, type MockResponse } from "../../jest.setup";

const MarzbanController = require("../../src/controllers/MarzbanController").default;

describe("MarzbanController", () => {
  beforeEach(() => jest.resetAllMocks());

  it("should return admin token when admin credentials are provided on Login", async () => {
    const req: Partial<Request> = { body: { username: "admin", password: "pass" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    mockConfigDefaults();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.LoginToMarzban)
      ah.default.LoginToMarzban.mockResolvedValue("tok");
    if (ah && ah.default && ah.default.GetTotalUnpaid)
      ah.default.GetTotalUnpaid.mockResolvedValue({ TotalPriceUnpaid: 5, TotalLimitUnpaid: 0 });

    await MarzbanController.Login(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    const out = (res.json as jest.Mock).mock.calls[0][0];
    expect(out.Token).toBe("tok");
    expect(out.IsAdmin).toBe(true);
  });

  it("should return Invalid Account Information for wrong admin password on Login", async () => {
    const req: Partial<Request> = { body: { username: "admin", password: "bad" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const cf = jest.requireMock("../../src/utils/Config");
    if (cf && cf.default) {
      cf.default.GetSellerAdminUsername.mockResolvedValue("admin");
      cf.default.GetSellerAdminPassword.mockResolvedValue("pass");
    }

    await MarzbanController.Login(req as Request, res as MockResponse, next);

    // debug: print mock call counts
    // debug logs removed for cleaner test output

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      expect(err).toBeInstanceOf(Error);
    } else {
      expect(res.status).toHaveBeenCalledWith(500);
      const out = (res.json as jest.Mock).mock.calls[0][0];
      expect(out.Message).toBe("Invalid Account Information");
    }
  });

  it("should return seller token and limits when seller credentials are valid on Login", async () => {
    const req: Partial<Request> = { body: { username: "selleruser", password: "sellerpass" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    mockConfigDefaults({ GetDeletePaidAndRemovedUsers: jest.fn().mockResolvedValue("No") });

    const seller = {
      MarzbanUsername: "muser",
      MarzbanPassword: "mpass",
      Title: "SellerTitle",
      Limit: 10,
    };

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(seller),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.LoginToMarzban)
      ah.default.LoginToMarzban.mockResolvedValue("sellerTok");
    if (ah && ah.default && ah.default.GetTotalUnpaid)
      ah.default.GetTotalUnpaid.mockResolvedValue({ TotalPriceUnpaid: 3, TotalLimitUnpaid: 2 });

    await MarzbanController.Login(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const out = (res.json as jest.Mock).mock.calls[0][0];
    expect(out.Token).toBe("sellerTok");
    expect(out.IsAdmin).toBe(false);
    expect(out.Limit).toBe(8); // 10 - 2
  });

  it("should return Invalid Account Information when seller is not found on Login", async () => {
    const req: Partial<Request> = { body: { username: "noone", password: "p" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await MarzbanController.Login(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      expect(err).toBeInstanceOf(Error);
    } else {
      expect(res.status).toHaveBeenCalledWith(500);
      const out = (res.json as jest.Mock).mock.calls[0][0];
      expect(out.Message).toBe("Invalid Account Information");
    }
  });

  it("should return normalized accounts list on GetAccounts", async () => {
    const req: Partial<Request> = {
      params: { isall: "true", seller: "s1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const cf = jest.requireMock("../../src/utils/Config");
    if (cf && cf.default) cf.default.GetSubscriptionURL.mockResolvedValue("http://sub.test");
    if (cf && cf.default) cf.default.GetSellerAdminUsername.mockResolvedValue("admin");

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.GetAccountsSmart)
      ah.default.GetAccountsSmart.mockResolvedValue([{ a: 1 }]);
    if (ah && ah.default && ah.default.NormalizeAccountOutput)
      ah.default.NormalizeAccountOutput.mockImplementation((a: unknown) => ({ norm: a }));

    await MarzbanController.GetAccounts(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const out = (res.json as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].norm).toEqual({ a: 1 });
  });

  it("should merge Marzban and DB accounts and return a normalized list on GetAccount", async () => {
    const req: Partial<Request> = {
      params: { seller: "s1", search: "q" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.GetMarzbanAccounts)
      ah.default.GetMarzbanAccounts.mockResolvedValue({ data: { users: [{ Username: "m1" }] } });
    if (ah && ah.default && ah.default.GetMixedAccount)
      ah.default.GetMixedAccount.mockResolvedValue([{ Username: "mixed1" }]);
    if (ah && ah.default && ah.default.NormalizeAccountOutput)
      ah.default.NormalizeAccountOutput.mockImplementation((a: unknown) => a);

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue([{ Username: "db1" }]),
    }));

    await MarzbanController.GetAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const out = (res.json as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].Username).toBe("mixed1");
  });

  it("should return 404 when seller is not found on AddAccount", async () => {
    const req: Partial<Request> = {
      body: { username: "sNot", tariffId: "0123456789abcdef01234567" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    // license ok
    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    mdm.checkLicense.mockResolvedValue(true);

    // Mongoose models: SellerModel returns null
    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await MarzbanController.AddAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should forward an error when license check fails on AddAccount", async () => {
    const req: Partial<Request> = {
      body: { username: "sNot", tariffId: "0123456789abcdef01234567" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    mdm.checkLicense.mockResolvedValue(false);

    await MarzbanController.AddAccount(req as Request, res as MockResponse, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("should succeed and return 200 on valid AddAccount input", async () => {
    const req: Partial<Request> = {
      body: { username: "s1", tariffId: "0123456789abcdef01234567", onhold: false },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    mdm.checkLicense.mockResolvedValue(true);

    const tariff = { Duration: 1, DataLimit: 1 };
    const seller = { Title: "s1", save: jest.fn().mockResolvedValue({}) };

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    // SellerModel, TariffModel, AccountModel
    mocked.getModel
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(tariff) }))
      .mockImplementationOnce(() => {
        // Account constructor mock: create object with save
        const SaveMock = jest.fn().mockResolvedValue({});
        return function Account(this: { save?: jest.Mock }, data: Record<string, unknown>) {
          Object.assign(this, data);
          this.save = SaveMock;
          return this;
        };
      });

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    ah.default.GetUsernameAvailable.mockResolvedValue("generatedName");
    ah.default.GenerateProxiesAndInbounds.mockResolvedValue({ proxies: {}, inbounds: {} });

    const ax = jest.requireMock("axios");
    ax.default.post.mockResolvedValue({ data: { created: true } });

    await MarzbanController.AddAccount(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 404 when username parameter is missing on EditAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "" },
      headers: { authorization: "token" },
      body: { status: "active" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await MarzbanController.EditAccount(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should invalidate cache and return 200 on successful EditAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "u1" },
      headers: { authorization: "token" },
      body: { status: "active" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ax = jest.requireMock("axios");
    ax.default.put.mockResolvedValue({ data: { ok: true } });

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const account = { Username: "u1", Seller: "s1" };
    const seller = { Title: "s1" };
    mocked.getModel
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(account) }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    ah.default.InvalidateSellerAllCache.mockImplementation(() => {});

    await MarzbanController.EditAccount(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 404 when username parameter is missing on DisableAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "" },
      headers: { authorization: "token" },
      body: { status: "disabled" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await MarzbanController.DisableAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should invalidate cache and return 200 on successful DisableAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "u1" },
      headers: { authorization: "token" },
      body: { status: "disabled" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ax = jest.requireMock("axios");
    ax.default.put.mockResolvedValue({ data: { ok: true } });

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const account = { Username: "u1", Seller: "s1" };
    const seller = { Title: "s1" };
    mocked.getModel
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(account) }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    ah.default.InvalidateSellerAllCache.mockImplementation(() => {});

    await MarzbanController.DisableAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 404 when account not found on RemoveAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "missing" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await MarzbanController.RemoveAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should delete remote and local account and return 200 on successful RemoveAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "u1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const ax = jest.requireMock("axios");
    ax.default.delete.mockResolvedValue({});

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const account = { Username: "u1", Seller: "s1" };
    const seller = { Title: "s1" };
    // AccountModel should support both findOne and findOneAndDelete
    mocked.getModel
      .mockImplementationOnce(() => ({
        findOne: jest.fn().mockResolvedValue(account),
        findOneAndDelete: jest.fn().mockResolvedValue({}),
      }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }));

    ah.default.InvalidateSellerAllCache.mockImplementation(() => {});

    await MarzbanController.RemoveAccount(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should forward non-404 axios delete errors to next on RemoveAccount", async () => {
    const req: Partial<Request> = {
      params: { username: "u1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const ax = jest.requireMock("axios");
    ax.default.delete.mockRejectedValue({ response: { status: 500 } });

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const account = { Username: "u1", Seller: "s1" };
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(account),
    }));

    await MarzbanController.RemoveAccount(req as Request, res as MockResponse, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeDefined();
  });

  it("should post revoke to Marzban and invalidate cache on successful RevokeSub", async () => {
    const req: Partial<Request> = {
      params: { username: "u1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const ax = jest.requireMock("axios");
    ax.default.post.mockResolvedValue({});

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const account = { Username: "u1", Seller: "s1" };
    const seller = { Title: "s1" };
    mocked.getModel
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(account) }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }));

    ah.default.InvalidateSellerAllCache.mockImplementation(() => {});

    await MarzbanController.RevokeSub(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 404 when tariffId is missing on RenewAccount", async () => {
    const req: Partial<Request> = {
      body: { tariffId: "", username: "u1" },
      params: { seller: "s1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    if (mdm && mdm.default && mdm.default.checkLicense)
      mdm.default.checkLicense.mockResolvedValue(true);

    await MarzbanController.RenewAccount(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should return 404 when username is missing on RenewAccount", async () => {
    const req: Partial<Request> = {
      body: { tariffId: "0123456789abcdef01234567", username: "" },
      params: { seller: "s1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    if (mdm && mdm.default && mdm.default.checkLicense)
      mdm.default.checkLicense.mockResolvedValue(true);

    await MarzbanController.RenewAccount(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should forward error when license check fails on RenewAccount", async () => {
    const req: Partial<Request> = {
      body: { tariffId: "0123456789abcdef01234567", username: "u1" },
      params: { seller: "s1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    mdm.checkLicense.mockResolvedValue(false);

    await MarzbanController.RenewAccount(req as Request, res as MockResponse, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("should create account and return 200 on successful RenewAccount", async () => {
    const req: Partial<Request> = {
      body: { tariffId: "0123456789abcdef01234567", username: "u1" },
      params: { seller: "s1" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
    ah.default.GenerateProxiesAndInbounds.mockResolvedValue({ inbounds: {} });

    const mdm = jest.requireMock("../../src/utils/MongooseDbManagement");
    mdm.checkLicense.mockResolvedValue(true);

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    const tariff = { Duration: 1, DataLimit: 1 };
    const seller = { Title: "s1", save: jest.fn().mockResolvedValue({}) };
    // controller calls getModel(Account), getModel(Seller), getModel(Tariff)
    mocked.getModel
      .mockImplementationOnce(() => {
        const SaveMock = jest.fn().mockResolvedValue({});
        return function Account() {
          return { save: SaveMock };
        };
      })
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(seller) }))
      .mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(tariff) }));

    const ax = jest.requireMock("axios");
    ax.default.put.mockResolvedValue({ data: { ok: true } });
    ax.default.post.mockResolvedValue({ data: { reset: true } });

    await MarzbanController.RenewAccount(req as Request, res as MockResponse, next);
    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
