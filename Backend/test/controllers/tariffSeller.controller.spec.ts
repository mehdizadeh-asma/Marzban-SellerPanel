import type { Request } from "express";
import "../helpers";
import type { MockResponse } from "../helpers";
import { createModelMock, mockNext, mockResponse } from "../helpers";

const TariffSellerController = require("../../src/controllers/TariffSellerController").default;

describe("TariffSellerController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementation(() => createModelMock());
    const mockedDb = jest.requireMock("../../src/db/MongooseDbManagement");
    mockedDb.default.getMainConnection.mockReturnValue({
      startSession: jest.fn().mockResolvedValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    });
  });

  it("should return 400 when sellerId is invalid in GetTariffSellerListBySellerId", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.GetTariffSellerListBySellerId(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid sellerId",
      code: expect.any(String),
    });
  });

  it("should return merged tariff list with sellerId for matched tariffs", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const sellerTariffs = [{ TariffId: "t1" }];
    const allTariffs = [
      { _id: "t1", id: "t1", Title: "A", Price: 10 },
      { _id: "t2", id: "t2", Title: "B", Price: 20 },
    ];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(sellerTariffs),
    }));
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(allTariffs),
    }));

    const tres: MockResponse = res;
    await TariffSellerController.GetTariffSellerListBySellerId(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    const ret = (tres.json as jest.Mock).mock.calls[0][0] as Array<Record<string, unknown>>;
    const withSeller = ret.find((r) => (r.TariffId as string) === "t1");
    const withoutSeller = ret.find((r) => (r.TariffId as string) === "t2");
    expect(withSeller!["SellerId"]).toBe(req.params!.sellerId);
    expect(withoutSeller!["SellerId"]).toBe("");
  });

  it("should handle TariffId as ObjectId in GetTariffSellerListBySellerId", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const sellerTariffs = [{ TariffId: new (require("mongoose").Types.ObjectId)() }];
    const allTariffs = [
      { _id: sellerTariffs[0].TariffId, id: sellerTariffs[0].TariffId, Title: "A", Price: 10 },
    ];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(sellerTariffs),
    }));
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(allTariffs),
    }));

    const tres: MockResponse = res;
    await TariffSellerController.GetTariffSellerListBySellerId(req as Request, tres, next);

    expect(tres.status).toHaveBeenCalledWith(200);
  });

  it("should handle TariffId as populated object in GetTariffSellerListBySellerId", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const tariffId = new (require("mongoose").Types.ObjectId)();
    const sellerTariffs = [{ TariffId: { _id: tariffId } }];
    const allTariffs = [{ _id: tariffId, Title: "A", Price: 10 }];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(sellerTariffs),
    }));
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(allTariffs),
    }));

    await TariffSellerController.GetTariffSellerListBySellerId(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 400 when GetTariffSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.GetTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff seller id",
      code: expect.any(String),
    });
  });

  it("should return tariffSeller when it exists", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ _id: "x" }),
    }));

    const tres: MockResponse = res;
    await TariffSellerController.GetTariffSeller(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalledWith({ _id: "x" });
  });

  it("should call next when tariffSeller is not found", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000bb" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await TariffSellerController.GetTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Seller Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 400 when AddTariffSeller payload is invalid", async () => {
    const req: Partial<Request> = {
      body: { TariffID: "bad", SellerID: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.AddTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "TariffID and SellerID are required and must be valid",
      code: expect.any(String),
    });
  });

  it("should save and return the new tariffSeller", async () => {
    const req: Partial<Request> = {
      body: { TariffID: "0123456789abcdef01234567", SellerID: "0123456789abcdef01234568" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const saveMock = jest.fn().mockResolvedValue({ ok: true });
    type WithSave = { save: jest.Mock } & Record<string, unknown>;
    const TariffSellerModel = function (payload: Record<string, unknown>) {
      return { ...payload, save: saveMock } as WithSave;
    };

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => TariffSellerModel as unknown as Function);

    await TariffSellerController.AddTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 400 when AssignTariffSeller sellerId is invalid", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "bad" },
      body: { TariffIds: ["0123456789abcdef01234567"] },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.AssignTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid sellerId",
      code: expect.any(String),
    });
  });

  it("should return 400 when TariffIds is not an array", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000cc" },
      body: { TariffIds: "not-array" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.AssignTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "TariffIds must be an array",
      code: expect.any(String),
    });
  });

  it("should return 400 when TariffIds contain invalid entries", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000cc" },
      body: { TariffIds: ["bad"] },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.AssignTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "TariffIds contain invalid entries",
      code: expect.any(String),
    });
  });

  it("should delete old entries and insert new ones for AssignTariffSeller", async () => {
    const req: Partial<Request> = {
      params: { sellerid: "0000000000000000000000cc" },
      body: { TariffIds: ["0123456789abcdef01234567"] },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const insertResult = [{ _id: "1" }];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue(insertResult),
    }));

    const tres: MockResponse = res;
    await TariffSellerController.AssignTariffSeller(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalledWith({
      message: "Tariffs successfully assigned to seller.",
      result: insertResult,
    });
  });

  it("should allow empty TariffIds array and skip insert", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000cc" },
      body: { TariffIds: [] },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const deleteMany = jest.fn().mockResolvedValue({});
    const insertMany = jest.fn();
    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany,
      insertMany,
    }));

    const tres: MockResponse = res;
    await TariffSellerController.AssignTariffSeller(req as Request, tres, next);

    expect(deleteMany).toHaveBeenCalled();
    expect(insertMany).not.toHaveBeenCalled();
    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalledWith({
      message: "Tariffs successfully assigned to seller.",
      result: [],
    });
  });

  it("returns 500 when database connection is missing", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "0000000000000000000000cc" },
      body: { TariffIds: ["0123456789abcdef01234567"] },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedDb = jest.requireMock("../../src/db/MongooseDbManagement");
    mockedDb.default.getMainConnection.mockReturnValue(null);

    await TariffSellerController.AssignTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Database connection error",
      code: expect.any(String),
    });
  });

  it("should return 400 when RemoveTariffSellerBySellerId sellerId is invalid", async () => {
    const req: Partial<Request> = {
      params: { sellerId: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.RemoveTariffSellerBySellerId(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid sellerId",
      code: expect.any(String),
    });
  });

  it("should delete tariff sellers by sellerId and return the result", async () => {
    const req: Partial<Request> = {
      params: { sellerid: "0000000000000000000000dd" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    }));

    const tres: MockResponse = res;
    await TariffSellerController.RemoveTariffSellerBySellerId(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect((tres.json as jest.Mock).mock.calls[0][0]).toHaveProperty("deletedCount", 1);
  });

  it("should return 400 when ChangeStatusTariffSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffSellerController.ChangeStatusTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariff seller id",
      code: expect.any(String),
    });
  });

  it("should toggle ChangeStatusTariffSeller status and save changes", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000ee" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ts = {
      _id: "0000000000000000000000ee",
      Status: "Active",
      save: jest.fn().mockResolvedValue(true),
    };
    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(ts) }));

    const tres: MockResponse = res;
    await TariffSellerController.ChangeStatusTariffSeller(req as Request, tres, next);

    expect(ts.save).toHaveBeenCalled();
    expect(tres.status).toHaveBeenCalledWith(200);
    const out = (tres.json as jest.Mock).mock.calls[0][0];
    expect(out).toHaveProperty("result");
  });

  it("should toggle status from Deactive to Active in ChangeStatusTariffSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000ef" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ts = {
      _id: "0000000000000000000000ef",
      Status: "Deactive",
      save: jest.fn().mockResolvedValue(true),
    };
    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(ts) }));

    const tres: MockResponse = res;
    await TariffSellerController.ChangeStatusTariffSeller(req as Request, tres, next);

    expect(ts.save).toHaveBeenCalled();
    expect(tres.status).toHaveBeenCalledWith(200);
  });

  it("should return 404 when ChangeStatusTariffSeller finds no entry", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000ef" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await TariffSellerController.ChangeStatusTariffSeller(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Tariff Seller Not Found!",
      code: expect.any(String),
    });
  });
});
