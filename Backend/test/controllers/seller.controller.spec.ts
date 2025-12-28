import type { Request } from "express";
import { Types } from "mongoose";

import type { MockResponse } from "../helpers";
import { createModelMock, mockNext, mockResponse } from "../helpers";

const SellerController = require("../../src/controllers/SellerController").default;

type SellerModelType = {
  new (): { validateSync: jest.Mock };
  findOne?: jest.Mock;
  findById?: jest.Mock;
  findByIdAndUpdate?: jest.Mock;
};

describe("SellerController", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    const mockedModule = jest.requireMock("../../src/db/MongooseModel");
    mockedModule.getModel.mockImplementation(() => createModelMock());
    const config = jest.requireMock("../../src/config/Config").default;
    if (config.GetJwtSecret) {
      config.GetJwtSecret.mockResolvedValue("jwt-secret");
    } else {
      config.GetJwtSecret = jest.fn().mockResolvedValue("jwt-secret");
    }
  });

  it("should return transformed sellers for GetSellerList", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const sellerAId = new Types.ObjectId();
    const sellerBId = new Types.ObjectId();
    const tariffAId = new Types.ObjectId();
    const tariffBId = new Types.ObjectId();
    const fakeSellers = [
      {
        _id: sellerAId,
        toObject: () => ({ _id: sellerAId, Title: "S1", Password: "p1", MarzbanPassword: "m1" }),
      },
      {
        _id: sellerBId,
        toObject: () => ({ _id: sellerBId, Title: "S2", Password: "p2", MarzbanPassword: "m2" }),
      },
    ];
    const unpaidAccounts = [
      { Seller: sellerAId, TariffId: tariffAId },
      { Seller: sellerAId, TariffId: tariffBId },
      { Seller: sellerBId, TariffId: tariffBId },
    ];
    const tariffs = [
      { _id: tariffAId, Price: 100 },
      { _id: tariffBId, Price: 50 },
    ];

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel
      .mockImplementationOnce(() => ({
        find: jest.fn().mockResolvedValue(fakeSellers),
      }))
      .mockImplementationOnce(() => ({
        find: jest.fn().mockResolvedValue(unpaidAccounts),
      }))
      .mockImplementationOnce(() => ({
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tariffs) }),
      }));

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.GetAccountSellerId)
      ah.default.GetAccountSellerId.mockImplementation((account: { Seller: Types.ObjectId }) =>
        account.Seller.toString(),
      );

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { _id: sellerAId, Title: "S1", TotalPrice: 150 },
      { _id: sellerBId, Title: "S2", TotalPrice: 50 },
    ]);
  });

  it("should return empty list when no sellers exist", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" } };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel
      .mockImplementationOnce(() => ({
        find: jest.fn().mockResolvedValue([]),
      }))
      .mockImplementationOnce(() => ({
        find: jest.fn().mockResolvedValue([]),
      }))
      .mockImplementationOnce(() => ({
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }));

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("should call next when GetSellerList fails", async () => {
    const req: Partial<Request> = { headers: { authorization: "token" }, query: {} };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const SellerService = require("../../src/services/SellerService");
    jest.spyOn(SellerService, "getSellerList").mockRejectedValueOnce(new Error("boom"));

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    expect(next).toHaveBeenCalled();
  });

  it("should paginate sellers when limit is provided", async () => {
    const req: Partial<Request> = {
      headers: { authorization: "token" },
      query: { page: ["2"], limit: ["1"] },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const fakeSellers = [{ _id: "s1", toObject: () => ({ _id: "s1", Title: "S1" }) }];
    const limitMock = jest.fn().mockResolvedValue(fakeSellers);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const SellerModel = { find: jest.fn().mockReturnValue({ skip: skipMock }) };

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel
      .mockImplementationOnce(() => SellerModel)
      .mockImplementationOnce(() => ({ find: jest.fn().mockResolvedValue([]) }))
      .mockImplementationOnce(() => ({
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }));

    await SellerController.GetSellerList(req as Request, res as MockResponse, next);

    expect(skipMock).toHaveBeenCalledWith(1);
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return a seller when it is found", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({ Title: "X" }),
    }));

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ Title: "X" });
  });

  it("should sanitize seller fields when found", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findOne: jest.fn().mockResolvedValue({
        toObject: () => ({ Title: "X", Password: "p", MarzbanPassword: "m" }),
      }),
    }));

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

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

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller not found",
      code: expect.any(String),
    });
  });

  it("should return 400 when GetSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    await SellerController.GetSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid seller id",
      code: expect.any(String),
    });
  });

  it("should return 400 when Marzban auth fails on AddSeller", async () => {
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

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue(null) }));

    await SellerController.AddSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Marzban Account Information",
      code: expect.any(String),
    });
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
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.AddSeller(req as Request, res as MockResponse, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(saved);
  });

  it("should return 400 when EditSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      body: { MarzbanUsername: "m", MarzbanPassword: "mp" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid seller id",
      code: expect.any(String),
    });
  });

  it("should return 400 when Marzban credentials are missing on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000006" },
      body: { MarzbanUsername: "  ", MarzbanPassword: undefined },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Marzban credentials are required",
      code: expect.any(String),
    });
  });

  it("should return 400 when Limit is invalid on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000006" },
      body: { Limit: -1, MarzbanUsername: "m", MarzbanPassword: "mp" },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Limit must be a valid number",
      code: expect.any(String),
    });
  });

  it("should return 400 when required fields missing on AddSeller", async () => {
    const req: Partial<Request> = {
      body: {
        Title: "T",
        Limit: "1",
        Username: "u",
        Password: undefined,
        MarzbanUsername: "m",
        MarzbanPassword: undefined,
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

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.AddSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Required seller fields are missing or invalid",
      code: expect.any(String),
    });
  });

  it("should return 400 when Marzban auth fails on EditSeller", async () => {
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

    await SellerController.EditSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Marzban Account Information",
      code: expect.any(String),
    });
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
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue({
      _id: "000000000000000000000020",
      Password: "plain",
      MarzbanPassword: "enc",
    });
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updated);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

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

  it("should return 400 when seller validation fails on EditSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000022" },
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
      return { ...payload, validateSync: jest.fn().mockReturnValue(new Error("bad seller")) };
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue({
      _id: "000000000000000000000022",
      Password: "plain",
      MarzbanPassword: "enc",
    });

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "bad seller", code: expect.any(String) });
  });

  it("should skip optional update fields when payload omits them", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000021" },
      body: {
        Title: "",
        Limit: undefined,
        Username: "",
        Password: "",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const current = { _id: "000000000000000000000021", Password: "plain", MarzbanPassword: "enc" };
    const updated = { _id: "000000000000000000000021", Title: "Old" };
    const SellerModel = function SellerModelCtor(payload: Record<string, unknown>) {
      return { ...payload, validateSync: jest.fn() };
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue(current);
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updated);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(SellerModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "000000000000000000000021",
      {
        MarzbanUsername: "m",
        MarzbanPassword: expect.any(String),
      },
      { new: true, runValidators: true },
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should keep existing passwords when update payload omits them", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000020" },
      body: {
        Title: "T",
        Limit: 1,
        Username: "u",
        MarzbanUsername: "m",
        MarzbanPassword: "mp",
      },
      headers: { authorization: "token" },
    };
    const res: MockResponse = mockResponse();
    const next = mockNext();

    const axiosMock = jest.requireMock("axios");
    axiosMock.default.post.mockResolvedValue({ data: {} });

    const current = { _id: "000000000000000000000020", Password: "plain", MarzbanPassword: "enc" };
    const SellerModel = function SellerModelCtor(payload: Record<string, unknown>) {
      return { ...payload, validateSync: jest.fn() };
    } as unknown as SellerModelType;
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue(current);
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(current);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(SellerModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller updated successfully",
      seller: current,
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
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue({
      _id: "000000000000000000000021",
      Password: "plain",
      MarzbanPassword: "enc",
    });
    SellerModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found",
      code: expect.any(String),
    });
  });

  it("should return 404 when current seller missing before update", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000022" },
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
    SellerModel.findOne = jest.fn().mockResolvedValue(null);
    SellerModel.findById = jest.fn().mockResolvedValue(null);

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => SellerModel);

    const ah = jest.requireMock("../../src/services/account/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    await SellerController.EditSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found",
      code: expect.any(String),
    });
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

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({ findOne: jest.fn().mockResolvedValue({}) }));

    await SellerController.EditSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Title Or Username Already Exists!",
      code: expect.any(String),
    });
  });

  it("should return 400 when RemoveSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await SellerController.RemoveSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid seller id",
      code: expect.any(String),
    });
  });

  it("should delete a seller and return the result on RemoveSeller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000011" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue({ _id: "000000000000000000000011" }),
    }));

    await SellerController.RemoveSeller(req as Request, res, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedCount: 1 });
  });

  it("should return 404 when RemoveSeller cannot find seller", async () => {
    const req: Partial<Request> = {
      params: { id: "000000000000000000000012" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const mocked = jest.requireMock("../../src/db/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    }));

    await SellerController.RemoveSeller(req as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found!",
      code: expect.any(String),
    });
  });

  it("should return 400 when DisableSeller id is invalid", async () => {
    const req: Partial<Request> = {
      params: { id: "bad" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    await SellerController.DisableSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid seller id",
      code: expect.any(String),
    });
  });

  it("should toggle seller status and save on DisableSeller", async () => {
    const res = mockResponse();
    const next = mockNext();

    const seller = {
      _id: "000000000000000000000005",
      Status: "Active",
      save: jest.fn().mockResolvedValue(true),
    };

    const SellerModel = { findOne: jest.fn().mockResolvedValue(seller) } as { findOne: jest.Mock };

    const mm = jest.requireMock("../../src/db/MongooseModel");
    mm.getModel.mockImplementationOnce(() => SellerModel as unknown as { findOne: jest.Mock });

    const req = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    } as Partial<Request>;
    await SellerController.DisableSeller(req as Request, res as MockResponse, next);

    expect(SellerModel.findOne).toHaveBeenCalled();
    expect(seller.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Seller Changed!", status: "Deactive" });
  });

  it("should set status to Deactive when seller is Active", async () => {
    const res = mockResponse();
    const next = mockNext();

    const seller = {
      _id: "000000000000000000000006",
      Status: "Active",
      save: jest.fn().mockResolvedValue(true),
    };

    const SellerModel = { findOne: jest.fn().mockResolvedValue(seller) } as { findOne: jest.Mock };
    const mm = jest.requireMock("../../src/db/MongooseModel");
    mm.getModel.mockImplementationOnce(() => SellerModel as unknown as { findOne: jest.Mock });

    const req = {
      params: { id: "000000000000000000000006" },
      headers: { authorization: "token" },
    } as Partial<Request>;

    await SellerController.DisableSeller(req as Request, res as MockResponse, next);

    expect(seller.Status).toBe("Deactive");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ result: "Seller Changed!", status: "Deactive" });
  });

  it("should do nothing when seller not found in DisableSeller", async () => {
    const res = mockResponse();
    const next = mockNext();

    const SellerModel = { findOne: jest.fn().mockResolvedValue(null) } as { findOne: jest.Mock };
    const mm = jest.requireMock("../../src/db/MongooseModel");
    mm.getModel.mockImplementationOnce(() => SellerModel as unknown as { findOne: jest.Mock });

    const req = {
      params: { id: "000000000000000000000005" },
      headers: { authorization: "token" },
    } as Partial<Request>;
    await SellerController.DisableSeller(req as Request, res as MockResponse, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Seller Not Found!",
      code: expect.any(String),
    });
  });
});
