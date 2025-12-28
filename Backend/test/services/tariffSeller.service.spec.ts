import { Types } from "mongoose";

import {
  addTariffSeller,
  assignTariffSeller,
  getTariffSeller,
  getTariffSellerListBySellerId,
  getVisibleTariffsForSellerId,
  removeTariffSellerBySellerId,
  toggleTariffSellerStatus,
} from "../../src/services/TariffSellerService";

jest.mock("../../src/db/MongooseModel", () => ({
  __esModule: true,
  getModel: jest.fn(),
}));

jest.mock("../../src/db/MongooseDbManagement", () => ({
  __esModule: true,
  default: {
    getMainConnection: jest.fn(),
  },
}));

const { getModel } = require("../../src/db/MongooseModel");
const MongooseDbManagement = require("../../src/db/MongooseDbManagement").default;

describe("TariffSellerService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("filters tariffs by visibility when visibleOnly is true", async () => {
    const sellerId = new Types.ObjectId().toString();
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: new Types.ObjectId() }]),
    };
    const TariffModel = {
      find: jest.fn().mockResolvedValue([]),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(TariffSellerModel)
      .mockResolvedValueOnce(TariffModel);

    await getTariffSellerListBySellerId(sellerId, true);

    expect(TariffModel.find).toHaveBeenCalledWith({ IsVisible: true });
  });

  it("throws when sellerId is invalid in getTariffSellerListBySellerId", async () => {
    await expect(getTariffSellerListBySellerId("bad", false)).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("throws when sellerId is invalid in getVisibleTariffsForSellerId", async () => {
    await expect(getVisibleTariffsForSellerId("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("handles nested TariffId strings in getVisibleTariffsForSellerId", async () => {
    const sellerId = new Types.ObjectId().toString();
    const nestedId = new Types.ObjectId().toString();
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: { _id: nestedId } }]),
    };
    const TariffModel = {
      find: jest.fn().mockResolvedValue([]),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(TariffSellerModel)
      .mockResolvedValueOnce(TariffModel);

    await getVisibleTariffsForSellerId(sellerId);

    const query = (TariffModel.find as jest.Mock).mock.calls[0][0] as {
      _id: { $in: Types.ObjectId[] };
    };
    expect(query._id.$in[0].toString()).toBe(nestedId);
  });

  it("handles string TariffId values in getVisibleTariffsForSellerId", async () => {
    const sellerId = new Types.ObjectId().toString();
    const validId = new Types.ObjectId().toString();
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: validId }, { TariffId: "bad" }]),
    };
    const TariffModel = {
      find: jest.fn().mockResolvedValue([]),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(TariffSellerModel)
      .mockResolvedValueOnce(TariffModel);

    await getVisibleTariffsForSellerId(sellerId);

    const query = (TariffModel.find as jest.Mock).mock.calls[0][0] as {
      _id: { $in: Types.ObjectId[] };
    };
    expect(query._id.$in).toHaveLength(1);
    expect(query._id.$in[0].toString()).toBe(validId);
  });

  it("skips nested TariffId values with unsupported types", async () => {
    const sellerId = new Types.ObjectId().toString();
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: { _id: 123 } }]),
    };
    const TariffModel = {
      find: jest.fn().mockResolvedValue([]),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(TariffSellerModel)
      .mockResolvedValueOnce(TariffModel);

    await getVisibleTariffsForSellerId(sellerId);

    const query = (TariffModel.find as jest.Mock).mock.calls[0][0] as {
      _id: { $in: Types.ObjectId[] };
    };
    expect(query._id.$in).toHaveLength(0);
  });

  it("skips nested TariffId strings when invalid", async () => {
    const sellerId = new Types.ObjectId().toString();
    const TariffSellerModel = {
      find: jest.fn().mockResolvedValue([{ TariffId: { _id: "bad" } }]),
    };
    const TariffModel = {
      find: jest.fn().mockResolvedValue([]),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(TariffSellerModel)
      .mockResolvedValueOnce(TariffModel);

    await getVisibleTariffsForSellerId(sellerId);

    const query = (TariffModel.find as jest.Mock).mock.calls[0][0] as {
      _id: { $in: Types.ObjectId[] };
    };
    expect(query._id.$in).toHaveLength(0);
  });

  it("throws when tariff seller id is invalid in getTariffSeller", async () => {
    await expect(getTariffSeller("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff seller id",
    });
  });

  it("throws when tariffId is invalid in addTariffSeller", async () => {
    await expect(addTariffSeller("bad", new Types.ObjectId().toString())).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when sellerId is invalid in addTariffSeller", async () => {
    await expect(addTariffSeller(new Types.ObjectId().toString(), "bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("throws when sellerId is invalid in assignTariffSeller", async () => {
    await expect(assignTariffSeller("bad", [])).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("throws when tariffIds are invalid in assignTariffSeller", async () => {
    await expect(
      assignTariffSeller(new Types.ObjectId().toString(), ["bad"]),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when sellerId is invalid in removeTariffSellerBySellerId", async () => {
    await expect(removeTariffSellerBySellerId("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("throws when tariff seller id is invalid in toggleTariffSellerStatus", async () => {
    await expect(toggleTariffSellerStatus("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff seller id",
    });
  });

  it("aborts transaction when assignTariffSeller fails", async () => {
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };
    MongooseDbManagement.getMainConnection.mockReturnValue({
      startSession: jest.fn().mockResolvedValue(session),
    });
    (getModel as jest.Mock).mockResolvedValueOnce({
      deleteMany: jest.fn().mockRejectedValue(new Error("delete fail")),
      insertMany: jest.fn(),
    });

    await expect(
      assignTariffSeller(new Types.ObjectId().toString(), [new Types.ObjectId().toString()]),
    ).rejects.toThrow("delete fail");

    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
});
