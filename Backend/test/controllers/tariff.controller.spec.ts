import type { Request } from "express";
import "../helpers";
import { mockNext, mockResponse } from "../helpers";

const TariffController = require("../../src/controllers/TariffController").default;

describe("TariffController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return tariffs when isall is true in GetTariffList", async () => {
    const req: Partial<Request> = {
      params: { isall: "true" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const fakeTariffs = [{ Title: "t1" }, { Title: "t2" }];
    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffs),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) {
      ah.default.CheckToken.mockResolvedValue(true);
    }

    await TariffController.GetTariffList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeTariffs);
  });

  it("should return 404 when isall is false and title is missing in GetTariffList", async () => {
    const req: Partial<Request> = {
      params: { isall: "false" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ result: "Seller Not Found!" });
  });

  it("should return 404 when isall is false and seller is missing in GetTariffList", async () => {
    const req: Partial<Request> = {
      params: { isall: "false", title: "missing" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    // TariffModel, SellerModel, TariffSellerModel
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ result: "Seller Not Found!" });
  });

  it("should return associated tariffs when isall is false in GetTariffList", async () => {
    const req: Partial<Request> = {
      params: { isall: "false", title: "seller1" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const fakeSeller = { _id: "sellerid" };
    const fakeTariffSellers = [{ TariffId: "t1" }, { TariffId: "t2" }];
    const fakeTariffs = [
      { _id: "t1", Title: "A" },
      { _id: "t2", Title: "B" },
    ];

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    // TariffModel (final find) should return fakeTariffs
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffs),
    }));
    // SellerModel
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(fakeSeller),
    }));
    // TariffSellerModel
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffSellers),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.GetTariffList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeTariffs);
  });

  it("should create and return a new tariff on AddTariff", async () => {
    const req: Partial<Request> = {
      body: { Title: "New", DataLimit: 10, Duration: 30, Price: 5, IsFree: false, IsVisible: true },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const saved = { _id: "tnew", Title: "New" };
    const saveMock = jest.fn().mockResolvedValue(saved);
    const TariffModel = function (payload: Record<string, unknown>) {
      return { ...payload, save: saveMock } as unknown as { save: jest.Mock; [k: string]: unknown };
    };

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.AddTariff(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should toggle tariff visibility when found in DisableTariff", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000001" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const saveMock = jest.fn().mockResolvedValue(true);
    const tariff = {
      _id: "000000000000000000000001",
      IsVisible: true,
      save: saveMock,
    };

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(tariff),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.DisableTariff(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Changed!" });
  });

  it("should return 404 when tariff not found in DisableTariff", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000002" },
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

    await TariffController.DisableTariff(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Not Found!" });
  });

  it("should toggle IsFree when tariff is found in FreeChanged", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000003" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const saveMock = jest.fn().mockResolvedValue(true);
    const tariff = {
      _id: "000000000000000000000003",
      IsFree: false,
      save: saveMock,
    };

    const mockedModule = jest.requireMock("../../src/utils/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(tariff),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.FreeChanged(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Changed!" });
  });

  it("should return 404 when tariff not found in FreeChanged", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000004" },
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

    await TariffController.FreeChanged(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Not Found!" });
  });

  it("should forward Invalid Token via next when CheckToken fails in GetTariffList", async () => {
    const req: Partial<Request> = {
      params: { isall: "true" },
      headers: { authorization: "bad" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(false);

    await TariffController.GetTariffList(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Invalid Token");
  });

  it("should forward Invalid Token via next when CheckToken fails in AddTariff", async () => {
    const req: Partial<Request> = {
      body: { Title: "New", DataLimit: 10, Duration: 30, Price: 5, IsFree: false, IsVisible: true },
      headers: { authorization: "bad" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(false);

    await TariffController.AddTariff(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Invalid Token");
  });
});
