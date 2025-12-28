import { Types } from "mongoose";

import {
  addTariff,
  editTariff,
  getTariffById,
  getTariffList,
  removeTariff,
  toggleTariffFree,
  toggleTariffVisibility,
} from "../../src/services/TariffService";

jest.mock("../../src/db/MongooseModel", () => ({
  __esModule: true,
  getModel: jest.fn(),
}));

const { getModel } = require("../../src/db/MongooseModel");

describe("TariffService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("defaults free and visible flags when adding tariff", async () => {
    const saveMock = jest.fn().mockResolvedValue({ ok: true });
    let created: Record<string, unknown> | null = null;
    const TariffModel = function (payload: Record<string, unknown>) {
      created = payload;
      return { ...payload, save: saveMock } as { save: jest.Mock };
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    await addTariff({ title: "T1", dataLimit: 1, duration: 1, price: 1 });

    expect(created).toMatchObject({ IsFree: false, IsVisible: true });
    expect(saveMock).toHaveBeenCalled();
  });

  it("updates all editable fields in editTariff", async () => {
    const tariffId = new Types.ObjectId().toString();
    const findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: tariffId });
    (getModel as jest.Mock).mockResolvedValueOnce({ findByIdAndUpdate });

    await editTariff(tariffId, {
      title: "New",
      dataLimit: 10,
      duration: 5,
      price: 2,
      isFree: true,
      isVisible: false,
    });

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      tariffId,
      {
        Title: "New",
        DataLimit: 10,
        Duration: 5,
        Price: 2,
        IsFree: true,
        IsVisible: false,
      },
      expect.any(Object),
    );
  });

  it("throws when seller id is invalid in getTariffList", async () => {
    (getModel as jest.Mock).mockResolvedValueOnce({}).mockResolvedValueOnce({});

    await expect(
      getTariffList({
        user: { role: "seller", sellerId: "bad", sessionId: "sid" },
        isAll: false,
      }),
    ).rejects.toMatchObject({ status: 400, message: "Invalid seller id" });
  });

  it("throws when tariff id is invalid in getTariffById", async () => {
    await expect(getTariffById("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when tariff id is invalid in editTariff", async () => {
    await expect(editTariff("bad", { title: "T" })).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when tariff id is invalid in removeTariff", async () => {
    await expect(removeTariff("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when tariff id is invalid in toggleTariffVisibility", async () => {
    await expect(toggleTariffVisibility("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when tariff id is invalid in toggleTariffFree", async () => {
    await expect(toggleTariffFree("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });
});
