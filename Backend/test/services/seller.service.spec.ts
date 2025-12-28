import { Types } from "mongoose";

import type { ISeller } from "../../src/models/Seller";
import {
  addSeller,
  editSeller,
  getSellerById,
  getSellerList,
  removeSeller,
  sanitizeSeller,
  toggleSellerStatus,
} from "../../src/services/SellerService";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: {
    GetMarzbanURL: jest.fn(),
  },
}));

jest.mock("../../src/services/account/AccountHelpers", () => ({
  __esModule: true,
  default: {
    GetAccountSellerId: jest.fn(),
  },
}));

jest.mock("../../src/services/security/CryptoService", () => ({
  __esModule: true,
  CryptoService: {
    encrypt: jest.fn(),
  },
}));

jest.mock("../../src/services/security/PasswordService", () => ({
  __esModule: true,
  PasswordService: {
    hashPassword: jest.fn(),
  },
}));

jest.mock("../../src/db/MongooseModel", () => ({
  __esModule: true,
  getModel: jest.fn(),
}));

const axios = require("axios").default;
const ConfigFile = require("../../src/config/Config").default;
const AccountHelpers = require("../../src/services/account/AccountHelpers").default;
const { CryptoService } = require("../../src/services/security/CryptoService");
const { PasswordService } = require("../../src/services/security/PasswordService");
const { getModel } = require("../../src/db/MongooseModel");

describe("SellerService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ConfigFile.GetMarzbanURL.mockResolvedValue("http://marzban.test");
    axios.post.mockResolvedValue({ data: {} });
    CryptoService.encrypt.mockResolvedValue("enc");
    PasswordService.hashPassword.mockResolvedValue("hash");
  });

  it("returns null when sanitizing a null seller", () => {
    expect(sanitizeSeller(null)).toBeNull();
  });

  it("throws when seller id is invalid in getSellerById", async () => {
    await expect(getSellerById("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("defaults to page 1 when page is invalid in getSellerList", async () => {
    const limitMock = jest.fn().mockResolvedValue([]);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const SellerModel = { find: jest.fn().mockReturnValue({ skip: skipMock }) };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce({ find: jest.fn().mockResolvedValue([]) })
      .mockResolvedValueOnce({
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      });

    await getSellerList({ page: 0, limit: 2 });

    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(2);
  });

  it("builds totals with mixed tariff id shapes in getSellerList", async () => {
    const sellerId = new Types.ObjectId();
    const t1 = new Types.ObjectId();
    const t2 = new Types.ObjectId();
    const t3 = new Types.ObjectId();
    const tMissing = new Types.ObjectId();

    const sellers = [
      {
        _id: sellerId,
        toObject: () => ({ _id: sellerId, Title: "Seller" }),
      },
    ];
    const unpaidAccounts = [
      { Seller: sellerId, TariffId: t1, Username: "obj" },
      { Seller: sellerId, TariffId: t2.toString(), Username: "str" },
      { Seller: sellerId, TariffId: { _id: t3 }, Username: "obj2" },
      { Seller: sellerId, TariffId: undefined, Username: "missing" },
      { Seller: sellerId, TariffId: tMissing.toString(), Username: "noTariff" },
      { Seller: sellerId, TariffId: t1, Username: "skip" },
    ];
    const tariffs = [{ _id: t1, Price: 5 }, { _id: t2 }];

    const SellerModel = { find: jest.fn().mockResolvedValue(sellers) };
    const AccountModel = { find: jest.fn().mockResolvedValue(unpaidAccounts) };
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tariffs) }),
    };
    (getModel as jest.Mock)
      .mockResolvedValueOnce(SellerModel)
      .mockResolvedValueOnce(AccountModel)
      .mockResolvedValueOnce(TariffModel);

    AccountHelpers.GetAccountSellerId.mockImplementation((account: { Username: string }) =>
      account.Username === "skip" ? undefined : sellerId.toString(),
    );

    const result = await getSellerList({});

    expect(result[0]).toMatchObject({ Title: "Seller", TotalPrice: 5 });
  });

  it("throws when adding a duplicate seller", async () => {
    const SellerModel = { findOne: jest.fn().mockResolvedValue({ _id: "dup" }) };
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);

    await expect(
      addSeller({
        title: "T",
        limit: 1,
        username: "u",
        password: "p",
        marzbanUsername: "m",
        marzbanPassword: "mp",
      }),
    ).rejects.toMatchObject({ status: 400, message: "Title Or Username Already Exists!" });
  });

  it("uses current seller values when editSeller params are missing", async () => {
    const currentSeller = {
      _id: new Types.ObjectId(),
      Title: "Old",
      Limit: 1,
      Username: "old",
      Password: "pwd",
    };
    const SellerModel = Object.assign(
      function SellerCtor(payload: Record<string, unknown>) {
        return { ...payload, validateSync: jest.fn() };
      },
      {
        findById: jest.fn().mockResolvedValue(currentSeller),
        findByIdAndUpdate: jest.fn().mockResolvedValue({
          _id: currentSeller._id,
          Title: currentSeller.Title,
          Username: currentSeller.Username,
        }),
      },
    );
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);

    const result = await editSeller(currentSeller._id.toString(), {
      marzbanUsername: "m",
      marzbanPassword: "mp",
    });

    expect(result).toMatchObject({ Title: "Old", Username: "old" });
  });

  it("throws when seller id is invalid in editSeller", async () => {
    await expect(
      editSeller("bad", { marzbanUsername: "m", marzbanPassword: "mp" }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("throws when seller id is invalid in removeSeller", async () => {
    await expect(removeSeller("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });

  it("toggles seller status from Active to Deactive and back", async () => {
    const activeSeller: ISeller = {
      _id: new Types.ObjectId(),
      Title: "S",
      Limit: 1,
      Username: "u",
      Password: "p",
      MarzbanUsername: "m",
      MarzbanPassword: "mp",
      Status: "Active",
      save: jest.fn().mockResolvedValue(true),
    } as unknown as ISeller;
    const deactiveSeller = { ...activeSeller, Status: "Deactive", save: jest.fn() };

    const SellerModel = {
      findOne: jest.fn().mockResolvedValueOnce(activeSeller).mockResolvedValueOnce(deactiveSeller),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel).mockResolvedValueOnce(SellerModel);

    const first = await toggleSellerStatus(activeSeller._id.toString());
    const second = await toggleSellerStatus(activeSeller._id.toString());

    expect(first).toBe("Deactive");
    expect(second).toBe("Active");
  });

  it("throws when seller id is invalid in toggleSellerStatus", async () => {
    await expect(toggleSellerStatus("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid seller id",
    });
  });
});
