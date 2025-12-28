import type { Request } from "express";
import "../helpers";
import type { MockResponse } from "../helpers";
import { createModelMock, mockNext, mockResponse } from "../helpers";

const TariffInboundController = require("../../src/controllers/TariffInboundController").default;

describe("TariffInboundController", () => {
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

  it("should return 400 when tariffId is invalid in GetTariffInboundListByTariffId", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariffId",
      code: expect.any(String),
    });
  });

  it("should return merged tariff inbound list with tariffId for matched tags", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const tariffInbounds = [{ InboundTag: "in1" }, { InboundTag: "in2" }];

    const allInbound = [
      { InboundTag: "in1", InboundType: "t1" },
      { InboundTag: "in3", InboundType: "t2" },
    ];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(tariffInbounds),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.GetInbounds)
      ah.default.GetInbounds.mockResolvedValue(allInbound);

    const tres: MockResponse = res;
    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalled();
    const returned = (tres.json as jest.Mock).mock.calls[0][0] as Array<Record<string, unknown>>;
    const in1 = returned.find((r) => (r.InboundTag as string) === "in1");
    const in3 = returned.find((r) => (r.InboundTag as string) === "in3");
    expect(in1!["TariffId"]).toBe(req.params!.tariffId);
    expect(in3!["TariffId"]).toBe("");
  });

  it("should call next when GetTariffInboundListByTariffId fails", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => {
      throw new Error("db fail");
    });

    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should handle empty inbound lists", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue([]),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.GetInbounds) ah.default.GetInbounds.mockResolvedValue([]);

    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should call next when GetInbounds throws", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue([]),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.GetInbounds)
      ah.default.GetInbounds.mockRejectedValue(new Error("get inbound fail"));

    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should include entries with undefined inbound tags", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const tariffInbounds = [{ InboundTag: undefined }];
    const allInbound = [{ InboundTag: "in1", InboundType: "t1" }];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(tariffInbounds),
    }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.GetInbounds)
      ah.default.GetInbounds.mockResolvedValue(allInbound);

    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    const out = (res.json as jest.Mock).mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(out.length).toBeGreaterThan(0);
  });

  it("should return 400 when tariffId is invalid in AssignTariffInbound", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "bad" },
      body: [{ InboundTag: "x", InboundType: "t" }],
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffInboundController.AssignTariffInbound(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid tariffId",
      code: expect.any(String),
    });
  });

  it("should return 400 when inbound list is not an array", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000bb" },
      body: { InboundTag: "x", InboundType: "t" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffInboundController.AssignTariffInbound(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Inbound list must be an array",
      code: expect.any(String),
    });
  });

  it("should delete old entries and insert new ones for AssignTariffInbound", async () => {
    const req: Partial<Request> = {
      params: { tariffid: "0000000000000000000000bb" },
      body: [{ InboundTag: "x", InboundType: "t" }],
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

    const tres2: MockResponse = res;
    await TariffInboundController.AssignTariffInbound(req as Request, tres2, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres2.status).toHaveBeenCalledWith(200);
    expect(tres2.json).toHaveBeenCalledWith({
      message: "Inbounds successfully assigned to Package.",
      result: insertResult,
    });
  });

  it("returns 400 when inbound items are missing required fields", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000bb" },
      body: [{ InboundTag: "x" }],
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await TariffInboundController.AssignTariffInbound(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Inbound items must include InboundTag and InboundType",
      code: expect.any(String),
    });
  });

  it("returns 500 when database connection is missing", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000bb" },
      body: [{ InboundTag: "x", InboundType: "t" }],
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mockedDb = jest.requireMock("../../src/db/MongooseDbManagement");
    mockedDb.default.getMainConnection.mockReturnValue(null);

    await TariffInboundController.AssignTariffInbound(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Database connection error",
      code: expect.any(String),
    });
  });

  it("should call next when AssignTariffInbound insert fails", async () => {
    const req: Partial<Request> = {
      params: { tariffid: "0000000000000000000000cc" },
      body: [{ InboundTag: "x", InboundType: "t" }],
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockRejectedValue(new Error("insert fail")),
    }));

    await TariffInboundController.AssignTariffInbound(req as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});
