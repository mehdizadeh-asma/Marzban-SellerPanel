import type { Request } from "express";
import "../helpers";
import type { MockResponse } from "../helpers";
import { mockNext, mockResponse } from "../helpers";

const TariffSellerController = require("../../src/controllers/TariffSellerController").default;

describe("TariffSellerController", () => {
  beforeEach(() => jest.resetAllMocks());

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

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    // first call returns TariffSellerModel, second returns TariffModel
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(sellerTariffs),
    }));
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(allTariffs),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

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

  it("should return tariffSeller when it exists", async () => {
    const req: Partial<Request> = {
      params: { id: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ _id: "x" }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

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

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffSellerController.GetTariffSeller(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
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

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => TariffSellerModel as unknown as Function);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await TariffSellerController.AddTariffSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
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

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue(insertResult),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const tres: MockResponse = res;
    await TariffSellerController.AssignTariffSeller(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalledWith({
      message: "Tariffs successfully assigned to seller.",
      result: insertResult,
    });
  });

  it("should delete tariff sellers by sellerId and return the result", async () => {
    const req: Partial<Request> = {
      params: { sellerid: "0000000000000000000000dd" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const tres: MockResponse = res;
    await TariffSellerController.RemoveTariffSellerBySellerId(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect((tres.json as jest.Mock).mock.calls[0][0]).toHaveProperty("deletedCount", 2);
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
    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(ts) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const tres: MockResponse = res;
    await TariffSellerController.ChangeStatusTariffSeller(req as Request, tres, next);

    expect(ts.save).toHaveBeenCalled();
    expect(tres.status).toHaveBeenCalledWith(200);
    const out = (tres.json as jest.Mock).mock.calls[0][0];
    expect(out).toHaveProperty("result");
  });

  it("should forward an Invalid Token error via next when CheckToken fails on AddTariffSeller", async () => {
    const req: Partial<Request> = {
      body: { TariffID: "0123456789abcdef01234567", SellerID: "0123456789abcdef01234568" },
      headers: { authorization: "bad" },
    };
    const res = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(false);

    await TariffSellerController.AddTariffSeller(req as Request, res, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Invalid Token");
  });
});
