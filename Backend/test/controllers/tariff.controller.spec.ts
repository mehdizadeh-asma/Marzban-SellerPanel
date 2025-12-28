import type { Request } from "express";
import { Types } from "mongoose";
import "../helpers";
import { createModelMock, mockNext, mockResponse } from "../helpers";

const TariffController = require("../../src/controllers/TariffController").default;

describe("TariffController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementation(() => createModelMock());
  });

  it("should return tariffs when isall is true in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "admin"; sellerId: null; sessionId: string };
    } = {
      params: { isall: "true" },
      headers: { authorization: "token" },
      user: { role: "admin", sellerId: null, sessionId: "session-1" },
    };
    const res = mockResponse();
    const next = mockNext();

    const fakeTariffs = [{ Title: "t1" }, { Title: "t2" }];
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffs),
    }));

    await TariffController.GetTariffList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeTariffs);
  });

  it("should return 400 when GetTariff id is invalid", async () => {
    const res = mockResponse();
    const next = mockNext();

    await TariffController.GetTariff({ params: { id: "bad" } } as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Tariff Id",
      code: expect.any(String),
    });
  });

  it("should return tariff when GetTariff finds it", async () => {
    const res = mockResponse();
    const next = mockNext();
    const tariff = { _id: "t1", Title: "T1" };

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findById: jest.fn().mockResolvedValue(tariff),
    }));

    await TariffController.GetTariff(
      { params: { id: "000000000000000000000001" } } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tariff);
  });

  it("should return 404 when GetTariff cannot find it", async () => {
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findById: jest.fn().mockResolvedValue(null),
    }));

    await TariffController.GetTariff(
      { params: { id: "000000000000000000000002" } } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff id is invalid", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "bad" },
      body: { Title: "Updated" },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Tariff Id",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff DataLimit is not numeric", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { DataLimit: "bad" },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff DataLimit is negative", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { DataLimit: -1 },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff Duration is not numeric", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { Duration: "bad" },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff Duration is negative", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { Duration: -1 },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff IsFree is invalid", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { IsFree: "yes" },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff IsVisible is invalid", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { IsVisible: "yes" },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff payload invalid", async () => {
    const res = mockResponse();
    const next = mockNext();
    const req = {
      params: { id: "000000000000000000000003" },
      body: { Price: -1 },
    } as unknown as Request;

    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
  });

  it("should update and return tariff on EditTariff", async () => {
    const res = mockResponse();
    const next = mockNext();
    const updated = { _id: "t2", Title: "Updated" };

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndUpdate: jest.fn().mockResolvedValue(updated),
    }));

    const req = {
      params: { id: "000000000000000000000004" },
      body: { Title: "Updated", Price: 5, DataLimit: 10, Duration: 30 },
    } as unknown as Request;
    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("should return 404 when EditTariff cannot find tariff", async () => {
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    }));

    const req = {
      params: { id: "000000000000000000000004" },
      body: { Title: "Updated" },
    } as unknown as Request;
    await TariffController.EditTariff(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 400 when EditTariff payload missing", async () => {
    const res = mockResponse();
    const next = mockNext();

    await TariffController.EditTariff(
      { params: { id: "000000000000000000000004" }, body: {} } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "No tariff fields provided for update",
      code: expect.any(String),
    });
  });

  it("should return 400 when RemoveTariff id invalid", async () => {
    const res = mockResponse();
    const next = mockNext();

    await TariffController.RemoveTariff({ params: { id: "bad" } } as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Tariff Id",
      code: expect.any(String),
    });
  });

  it("should remove tariff on RemoveTariff", async () => {
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue({ _id: "t3" }),
    }));

    await TariffController.RemoveTariff(
      { params: { id: "000000000000000000000005" } } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedCount: 1 });
  });

  it("should return 404 when RemoveTariff cannot find tariff", async () => {
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    }));

    await TariffController.RemoveTariff(
      { params: { id: "000000000000000000000005" } } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 404 when isall is false and title is missing in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "admin"; sellerId: null; sessionId: string };
    } = {
      params: { isall: "false" },
      headers: { authorization: "token" },
      user: { role: "admin", sellerId: null, sessionId: "session-2" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 404 when isall is false and seller is missing in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "admin"; sellerId: null; sessionId: string };
    } = {
      params: { isall: "false", title: "missing" },
      headers: { authorization: "token" },
      user: { role: "admin", sellerId: null, sessionId: "session-3" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found!",
      code: expect.any(String),
    });
  });

  it("returns 403 when seller session context is missing in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "seller"; sellerId: null; sessionId: string };
    } = {
      params: { isall: "false" },
      headers: { authorization: "token" },
      user: { role: "seller", sellerId: null, sessionId: "session-4" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller context not found for current session",
      code: expect.any(String),
    });
  });

  it("returns 404 when session seller is not found in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "seller"; sellerId: string; sessionId: string };
    } = {
      params: { isall: "false" },
      headers: { authorization: "token" },
      user: { role: "seller", sellerId: "507f1f77bcf86cd799439011", sessionId: "session-5" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      findById: jest.fn().mockResolvedValue(null),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({ find: jest.fn() }));

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found!",
      code: expect.any(String),
    });
  });

  it("returns tariffs for seller with populated TariffId objects", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId();
    const req: Partial<Request> & {
      user: { role: "seller"; sellerId: string; sessionId: string };
    } = {
      params: { isall: "false" },
      headers: { authorization: "token" },
      user: { role: "seller", sellerId, sessionId: "session-6" },
    };
    const res = mockResponse();
    const next = mockNext();

    const TariffModel = { find: jest.fn().mockResolvedValue([{ _id: tariffId }]) };
    const SellerModel = {
      findById: jest.fn().mockResolvedValue({ Title: "Seller" }),
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: { _id: tariffId } }]),
    };
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);
    mockedModule.getModel.mockImplementationOnce(() => SellerModel);
    mockedModule.getModel.mockImplementationOnce(() => TariffSellerModel);
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it("returns tariffs for seller with TariffId as ObjectId", async () => {
    const sellerId = new Types.ObjectId().toString();
    const tariffId = new Types.ObjectId();
    const req: Partial<Request> & {
      user: { role: "seller"; sellerId: string; sessionId: string };
    } = {
      params: { isall: "false" },
      headers: { authorization: "token" },
      user: { role: "seller", sellerId, sessionId: "session-7" },
    };
    const res = mockResponse();
    const next = mockNext();

    const TariffModel = { find: jest.fn().mockResolvedValue([{ _id: tariffId }]) };
    const SellerModel = {
      findById: jest.fn().mockResolvedValue({ Title: "Seller" }),
      findOne: jest.fn().mockResolvedValue({ _id: sellerId, Title: "Seller" }),
    };
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: tariffId }]),
    };
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);
    mockedModule.getModel.mockImplementationOnce(() => SellerModel);
    mockedModule.getModel.mockImplementationOnce(() => TariffSellerModel);
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffController.GetTariffList(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it("should return associated tariffs when isall is false in GetTariffList", async () => {
    const req: Partial<Request> & {
      user: { role: "admin"; sellerId: null; sessionId: string };
    } = {
      params: { isall: "false", title: "seller1" },
      headers: { authorization: "token" },
      user: { role: "admin", sellerId: null, sessionId: "session-4" },
    };
    const res = mockResponse();
    const next = mockNext();

    const fakeSeller = { _id: new Types.ObjectId().toString() };
    const fakeTariffSellers = [{ TariffId: "t1" }, { TariffId: "t2" }];
    const fakeTariffs = [
      { _id: "t1", Title: "A" },
      { _id: "t2", Title: "B" },
    ];

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffs),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(fakeSeller),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffSellers),
    }));
    mockedModule.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeTariffs),
    }));

    await TariffController.GetTariffList(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeTariffs);
  });

  it("should return 400 when AddTariff payload is invalid", async () => {
    const req: Partial<Request> = {
      body: { Title: "", DataLimit: -1, Duration: 10, Price: 5 },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffController.AddTariff(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff payload",
      code: expect.any(String),
    });
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

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => TariffModel);

    await TariffController.AddTariff(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should return 400 when DisableTariff id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffController.DisableTariff(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Tariff Id",
      code: expect.any(String),
    });
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

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(tariff),
    }));

    await TariffController.DisableTariff(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Changed!", IsVisible: false });
  });

  it("should return 404 when tariff not found in DisableTariff", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000002" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));

    await TariffController.DisableTariff(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 400 when FreeChanged id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffController.FreeChanged(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Tariff Id",
      code: expect.any(String),
    });
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

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(tariff),
    }));

    await TariffController.FreeChanged(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) {
      const err = (next as jest.Mock).mock.calls[0][0];
      throw err instanceof Error ? err : new Error(String(err));
    }

    expect(saveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Tariff Changed!", IsFree: true });
  });

  it("should return 404 when tariff not found in FreeChanged", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000004" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue(null),
    }));

    await TariffController.FreeChanged(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Not Found!",
      code: expect.any(String),
    });
  });
});
