import type { Request } from "express";
import "../helpers";
import { mockNext, mockResponse } from "../helpers";

const AccountController = require("../../src/controllers/AccountController").default;

jest.mock("../../src/utils/MongooseModel");

describe("AccountController", () => {
  beforeEach(() => jest.resetAllMocks());

  it("should return accounts when GetAccountList is called with valid token", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" } };
    const res = mockResponse();
    const next = mockNext();

    const fakeAccounts = [{ Username: "a1" }];
    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeAccounts),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccountList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

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

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccount(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("should return the found account when GetAccount locates it", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a2" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ Username: "u1" }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.GetAccount(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ Username: "u1" });
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

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => AccountModel as unknown as Function);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.AddAccount(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should forward an 'Invalid Token' error when CheckToken fails during AddAccount", async () => {
    const req: Partial<Request> = {
      body: {
        Username: "u2",
        TariffID: "0000000000000000000000a5",
        SellerID: "0000000000000000000000a6",
      },
      headers: { authorization: "bad" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(false);

    await AccountController.AddAccount(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Invalid Token");
  });

  it("should delete the account and return success when RemoveAccount is called", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000a3" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.RemoveAccount(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should toggle Payed and save multiple accounts when PayAccounts is called", async () => {
    const req: Partial<Request> = { body: ["a1", "a2"], headers: { authorization: "token" } };
    const res = mockResponse();
    const next = mockNext();

    const acc1 = { Payed: false, save: jest.fn().mockResolvedValue(true) };
    const acc2 = { Payed: true, save: jest.fn().mockResolvedValue(true) };

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    const findMock = jest.fn().mockImplementation(async (q: unknown) => {
      const qq = q as { _id?: string } | undefined;
      if (qq && qq._id === "a1") return [acc1];
      if (qq && qq._id === "a2") return [acc2];
      return [];
    });
    mockedModule.getModel.mockImplementationOnce(() => ({ find: findMock }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccounts(req as Request, res, next);

    expect(acc1.save).toHaveBeenCalled();
    expect(acc2.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("Payments Changed Successfully!");
  });

  it("should toggle Payed and save a single account when PayAccount is called", async () => {
    const req: Partial<Request> = { params: { id: "a1" }, headers: { authorization: "token" } };
    const res = mockResponse();
    const next = mockNext();

    const acc = { Payed: false, save: jest.fn().mockResolvedValue(true) };

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(acc),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await AccountController.PayAccount(req as Request, res, next);

    expect(acc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("Payment Changed!");
  });
});
