import type { Request } from "express";
import type { MockResponse } from "../helpers";
import { mockNext, mockResponse } from "../helpers";

const SellerController = require("../../src/controllers/SellerController").default;

type SellerModelType = {
  new (): { validateSync: jest.Mock };
  findOne?: jest.Mock;
  findByIdAndUpdate?: jest.Mock;
};

describe("SellerController", () => {
  beforeEach(() => jest.resetAllMocks());

  it("should return transformed sellers for GetSellerList", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const fakeSellers = [
      { toObject: () => ({ Title: "S1" }), Status: "Active" },
      { toObject: () => ({ Title: "S2" }), Status: "Active" },
    ];

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(fakeSellers),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default) {
      if (ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);
      if (ah.default.GetTotalUnpaid)
        ah.default.GetTotalUnpaid.mockResolvedValue({ TotalPriceUnpaid: 123, TotalLimitUnpaid: 0 });
    }

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { Title: "S1", TotalPrice: 123 },
      { Title: "S2", TotalPrice: 123 },
    ]);
  });

  it("should return a seller when it is found", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ Title: "X" }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ Title: "X" });
  });

  it("should call next when seller is not found", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000006" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("should return 404 when Marzban auth fails on AddSeller", async () => {
    const req: Partial<Request> = {
      body: {
        Title: "T",
        Limit: "1",
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockRejectedValue(new Error("bad"));

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ save: jest.fn() }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.AddSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ Message: "Invalid Marzban Account Information" });
  });

  it("should save and return seller when Marzban auth succeeds on AddSeller", async () => {
    const req: Partial<Request> = {
      body: {
        Title: "T",
        Limit: "1",
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const saved = { _id: "s1", Title: "T" };
    const saveMock = jest.fn().mockResolvedValue(saved);
    const SellerModel = function (payload: Record<string, unknown>) {
      return { ...payload, save: saveMock } as unknown as { save: jest.Mock; [k: string]: unknown };
    };

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.AddSeller(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should return 404 when Marzban auth fails on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000007" },
      body: {
        Title: "T",
        Limit: 1,
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockRejectedValue(new Error("bad"));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.EditSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ Message: "Invalid Marzban Account Information" });
  });

  it("should update and return seller on successful EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000020" },
      body: {
        Title: "T",
        Limit: 1,
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const updated = { _id: "000000000000000000000020", Title: "T", Username: "u" };

    const SellerModel = function SellerModelCtor(payload: Record<string, unknown>) {
      return { ...payload, validateSync: jest.fn() };
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null); // no conflict
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updated);

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(SellerModel.findOne).toHaveBeenCalled();
    expect(SellerModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "000000000000000000000020",
      expect.any(Object),
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller updated successfully",
      seller: updated,
    });
  });

  it("should return 404 when updated seller is not found on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000021" },
      body: {
        Title: "T",
        Limit: 1,
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const SellerModel = function SellerModelCtor(payload: Record<string, unknown>) {
      return { ...payload, validateSync: jest.fn() };
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null); // no conflict
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Seller Not Found" });
  });

  it("should return 400 when title or username conflict on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000010" },
      body: {
        Title: "T",
        Limit: 1,
        Username: "u",
        Password: "p",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue({}) }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.EditSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Title Or Username Already Exists!" });
  });

  it("should delete a seller and return the result on RemoveSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000011" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.RemoveSeller(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should toggle seller status and save on DisableSeller", async () => {
    const res = mockResponse();
    const next = mockNext();

    const seller = {
      _id: "000000000000000000000005",
      Status: true,
      save: jest.fn().mockResolvedValue(true),
    };

    const SellerModel = { findOne: jest.fn().mockResolvedValue(seller) } as { findOne: jest.Mock };

    const mm = jest.requireMock("../../src/utils/MongooseModel");
    mm.getModel.mockImplementationOnce(() => SellerModel as unknown as { findOne: jest.Mock });

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const req = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    } as Partial<Request>;
    await SellerController.DisableSeller(req as Request, res as MockResponse, next);

    expect(SellerModel.findOne).toHaveBeenCalled();
    expect(seller.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Seller Changed!" });
  });

  it("should forward Invalid Token via next when CheckToken fails in GetSellerList", async () => {
    const req: Partial<Request> = { headers: { authorization: "bad" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(false);

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    expect((next as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Invalid Token");
  });
});
