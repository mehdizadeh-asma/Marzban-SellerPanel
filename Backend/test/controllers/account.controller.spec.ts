import type { Request } from "express";
import "../helpers";
import { createModelMock, mockNext, mockResponse } from "../helpers";

const AccountController = require("../../src/controllers/AccountController").default;

jest.mock("../../src/db/MongooseModel");

describe("AccountController", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementation(() => createModelMock());
  });

  it("should return accounts when GetAccountList is called with valid token", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" } };
    const res = mockResponse();
    const next = mockNext();

    const fakeAccounts = [{ Username: "a1" }];
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeAccounts),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccountList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeAccounts);
  });

  it("should call next when GetAccountList fails", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" }, query: {} };
    const res = mockResponse();
    const next = mockNext();

    const AccountService = require("../../src/services/AccountService");
    jest.spyOn(AccountService, "getAccountList").mockRejectedValueOnce(new Error("boom"));

    await AccountController.GetAccountList(req as Request, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should paginate account list when limit is provided", async () => {
    const req: Partial<Request> = {
      headers: { authorization: "token" },
      query: { page: ["2"], limit: ["1"] },
    };
    const res = mockResponse();
    const next = mockNext();

    const fakeAccounts = [{ Username: "paged" }];
    const limitMock = jest.fn().mockResolvedValue(fakeAccounts);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const findMock = jest.fn().mockReturnValue({ skip: skipMock });

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: findMock,
    }));

    await AccountController.GetAccountList(req as Request, res, next);

    expect(skipMock).toHaveBeenCalledWith(1);
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeAccounts);
  });

  it("should call next with an error when GetAccount cannot find the account", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a1" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account not found",
      code: expect.any(String),
    });
  });

  it("should return 400 when GetAccount id is invalid", async () => {
    const req: Partial<Request> = { params: { id: "bad" } };
    const res = mockResponse();
    const next = mockNext();

    await AccountController.GetAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid account id",
      code: expect.any(String),
    });
  });

  it("should return the found account when GetAccount locates it", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a2" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ Username: "u1" }),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccount(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ Username: "u1" });
  });

  it("should return 400 when AddAccount payload is invalid", async () => {
    const req: Partial<Request> = {
      body: {
        Username: "  ",
        TariffID: "bad",
        SellerID: "bad",
      },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await AccountController.AddAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Username, TariffID, and SellerID are required and must be valid",
      code: expect.any(String),
    });
  });

  it("should construct and save a new account when AddAccount is called with valid data", async () => {
    const req: Partial<Request> = {
      body: {
        Username: "u2",
        TariffID: "0000000000000000000000a5",
        SellerID: "0000000000000000000000a6",
      },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const saved = { _id: "acc1", Username: "u2" };
    const saveMock = jest.fn().mockResolvedValue(saved);
    const AccountModel = function (payload: Record<string, unknown>) {
      return { ...payload, save: saveMock } as { save: jest.Mock } & Record<string, unknown>;
    };

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => AccountModel as unknown as Function);

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.AddAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should return 400 when RemoveAccount id is invalid", async () => {
    const req: Partial<Request> = { params: { id: "bad" } };
    const res = mockResponse();
    const next = mockNext();

    await AccountController.RemoveAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid account id",
      code: expect.any(String),
    });
  });

  it("should delete the account and return success when RemoveAccount is called", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a3" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue({ _id: "a3", Username: "u3" }),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.RemoveAccount(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedCount: 1 });
  });

  it("should return 404 when RemoveAccount cannot find account", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a4" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    }));

    await AccountController.RemoveAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account not found",
      code: expect.any(String),
    });
  });

  it("should return 400 when PayAccounts input invalid", async () => {
    const req: Partial<Request> = {
      body: { accountIds: [], payed: undefined },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccounts(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "accountIds (array) and payed (boolean) are required",
      code: expect.any(String),
    });
  });

  it("should return 400 when PayAccounts includes invalid ids", async () => {
    const req: Partial<Request> = {
      body: { accountIds: ["bad"], payed: true },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await AccountController.PayAccounts(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid accountIds",
      code: expect.any(String),
    });
  });

  it("should update Payed flag for multiple accounts when PayAccounts is called", async () => {
    const req: Partial<Request> = {
      body: {
        accountIds: ["0000000000000000000000a1", "0000000000000000000000a2"],
        payed: true,
      },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue([
        { _id: "a1", Username: "u1", Payed: false },
        { _id: "a2", Username: "u2", Payed: false },
      ]),
      updateMany,
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccounts(req as Request, res, next);
    if ((next as jest.Mock).mock.calls.length > 0) {
      throw (next as jest.Mock).mock.calls[0][0];
    }

    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: [expect.anything(), expect.anything()] } },
      { $set: { Payed: true } },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("Payments updated successfully!");
  });

  it("should update Payed flag for a single account when PayAccount is called", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a1" },
      body: { payed: false },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: "a1", Payed: false }),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccount(req as Request, res, next);
    if ((next as jest.Mock).mock.calls.length > 0) {
      throw (next as jest.Mock).mock.calls[0][0];
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Payment updated!",
      account: { _id: "a1", Payed: false },
    });
  });

  it("should call next when PayAccounts update fails", async () => {
    const req: Partial<Request> = {
      body: {
        accountIds: ["0000000000000000000000a1"],
        payed: true,
      },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue([{ _id: "a1", Username: "u1", Payed: false }]),
      updateMany: jest.fn().mockRejectedValue(new Error("update failed")),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccounts(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should return 400 when payed flag missing in PayAccount", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a1" },
      body: { payed: undefined },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccount(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "payed (boolean) is required",
      code: expect.any(String),
    });
  });

  it("should return 400 when PayAccount id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      body: { payed: true },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await AccountController.PayAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid account id",
      code: expect.any(String),
    });
  });

  it("should return 404 when account not found in PayAccount", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a1" },
      body: { payed: true },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccount(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account not found",
      code: expect.any(String),
    });
  });

  it("should call next when PayAccount update throws", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a1" },
      body: { payed: true },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => {
      throw new Error("db fail");
    });

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccount(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});
