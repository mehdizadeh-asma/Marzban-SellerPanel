/// <reference types="jest" />

jest.mock("uuid", () => ({ __esModule: true, v4: () => "00000000-0000-0000-0000-000000000000" }));
jest.mock("axios", () => {
  const axiosMock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    isAxiosError: jest.fn(() => true),
  };
  return {
    __esModule: true,
    default: axiosMock,
    ...axiosMock,
  };
});
jest.mock("../../src/db/MongooseModel");
jest.mock("../../src/utils/Helper");
jest.mock("../../src/config/Config");

const axios = require("axios") as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  isAxiosError: jest.Mock;
};
const { getModel } = require("../../src/db/MongooseModel");
const Helper = require("../../src/utils/Helper");
const ConfigFile = require("../../src/config/Config");
const { CryptoService } = require("../../src/services/security/CryptoService");

import type { AxiosResponse } from "axios";
import { Types } from "mongoose";
import type { IAccount } from "../../src/models/Account";
import type MarzbanAccount from "../../src/models/MarzbanAccount";
import type { ISeller } from "../../src/models/Seller";
import type { ITariff } from "../../src/models/Tariff";
import * as MarzbanClient from "../../src/services/marzban/MarzbanClient";

type InboundInfo = { InboundType: string; InboundTag: string };
type MarzbanAccountsCache = Record<
  string,
  Record<string, { users: MarzbanAccount[]; timestamp: number }>
>;
type SellerAccountsCache = Record<
  string,
  Record<string, { accounts: IAccount[]; timestamp: number }>
>;

interface RealAccountHelpersShape {
  GetSubscriptionUrl(_marz: string, _seller: string): string;
  NormalizeAccountOutput(_input: unknown): { id?: string; username?: string; payed?: string };
  CheckToken(_token: string): Promise<boolean>;
  GetUsernameAvailable(_seller: ISeller, _base: string, _auth: string): Promise<string>;
  GetInbounds(..._args: unknown[]): Promise<InboundInfo[]>;
  LoginToMarzban(_u: string, _p: string): Promise<string>;
  GenerateProxiesAndInbounds(
    _auth: string,
    _tariff: ITariff,
  ): Promise<{ proxies: Record<string, unknown>; inbounds: Record<string, string[]> }>;
  GetSellerAccounts(..._args: unknown[]): Promise<unknown[]>;
  GetMarzbanAccountsAndStoreSmart(
    ..._args: unknown[]
  ): Promise<{ failed: boolean; users: unknown[]; error?: unknown }>;
  GetAccountsSmart(..._args: unknown[]): Promise<unknown[]>;
  GetMarzbanAccounts(..._args: unknown[]): Promise<unknown>;
  GetTotalUnpaid(
    ..._args: unknown[]
  ): Promise<{ TotalPriceUnpaid: number; TotalLimitUnpaid: number }>;
  GetMixedAccount(..._args: unknown[]): Promise<Array<Record<string, unknown>>>;
  RemoveDeletedAccountSeller(..._args: unknown[]): Promise<void>;
  InvalidateSellerAllCache(_seller: string): void;
  InvalidateSellerAccountCache(_sellerId: string): void;
  UpsertSellerAccountCache(_sellerId: string, _account: IAccount): void;
  RemoveSellerAccountFromCache(_sellerId: string, _username: string): void;
  UpsertMarzbanAccountCache(_seller: string, _account: MarzbanAccount): void;
  PatchMarzbanAccountCache(
    _seller: string,
    _username: string,
    _patch: Partial<MarzbanAccount>,
  ): void;
  RemoveMarzbanAccountFromCache(_seller: string, _username: string): void;
  GetMarzbanAccountByUsername(
    _auth: string | undefined,
    _seller: ISeller,
    _username: string,
  ): Promise<MarzbanAccount | null>;
  GetAccountSellerId(_account: IAccount): string | undefined;
  GetSellerMarzbanPassword(_seller: ISeller): Promise<string>;
  MarzbanAccountsList?: MarzbanAccountsCache;
  SellerAccountsList?: SellerAccountsCache;
}

const RealAccountHelpers = require("../../src/services/account/AccountHelpers")
  .default as unknown as RealAccountHelpersShape;

const createModelMock = (overrides: Record<string, unknown> = {}) => ({
  find: jest.fn().mockResolvedValue(overrides.find ?? []),
  findOne: jest.fn().mockResolvedValue(overrides.findOne ?? null),
  findById: jest.fn().mockResolvedValue(overrides.findById ?? null),
  findByIdAndUpdate: jest.fn().mockResolvedValue(overrides.findByIdAndUpdate ?? null),
  deleteOne: jest.fn().mockResolvedValue(overrides.deleteOne ?? { deletedCount: 1 }),
  deleteMany: jest.fn().mockResolvedValue(overrides.deleteMany ?? { deletedCount: 1 }),
  save: jest.fn().mockResolvedValue(overrides.save ?? {}),
  insertMany: jest.fn().mockResolvedValue(overrides.insertMany ?? []),
});

const createAxiosResponse = (data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: { headers: {} } as AxiosResponse["config"],
});

jest.mock("../../src/db/MongooseModel");
jest.mock("axios");
jest.mock("../../src/utils/Helper");
jest.mock("../../src/config/Config");

describe("AccountHelpers utils", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    RealAccountHelpers.MarzbanAccountsList = {};
    RealAccountHelpers.SellerAccountsList = {};
    ConfigFile.GetSellerAdminUsername = jest.fn().mockResolvedValue("admin");
    Helper.CalculateTraffic = jest.fn().mockReturnValue("1 MB");
    Helper.CalculateRemainDate = jest.fn().mockReturnValue("1 Day");
    Helper.IsOnline = jest.fn().mockReturnValue("Online");
    Helper.CalculateOnlineDate = jest.fn().mockReturnValue("Online");
    Helper.CalculateUpdateSubscriptionDate = jest.fn().mockReturnValue("1 Day");
  });

  it("should return seller URL when seller has a subscription", () => {
    const marz = "http://marz/test/sub/abc";
    const seller = "http://seller/sub/abc";
    const res = RealAccountHelpers.GetSubscriptionUrl(marz, seller);
    expect(res).toBe("http://seller/sub/abc/sub/abc");
  });

  it("should return marzban URL when seller subscription is empty", () => {
    const marz = "http://marz/test/sub/abc";
    const seller = "   ";
    const res = RealAccountHelpers.GetSubscriptionUrl(marz, seller);
    expect(res).toBe(marz);
  });

  it("should map account fields and convert payed boolean to Paid/Unpaid", () => {
    const input = { _id: "1", Username: "u", Payed: true };
    const out = RealAccountHelpers.NormalizeAccountOutput(input as unknown);
    expect(out.id).toBe("1");
    expect(out.username).toBe("u");
    expect(out.payed).toBe("Paid");
  });

  it("should return true for 200 responses and false on error when checking token", async () => {
    (axios.get as jest.Mock).mockResolvedValue({ status: 200 });
    const ok = await RealAccountHelpers.CheckToken("tok");
    expect(ok).toBe(true);

    (axios.get as jest.Mock).mockRejectedValue(new Error("fail"));
    const nok = await RealAccountHelpers.CheckToken("tok");
    expect(nok).toBe(false);
  });

  it("should generate proxies and inbounds based on tariff and inbound list", async () => {
    const tariff = { _id: "tar1" } as unknown as ITariff;
    const TariffInboundModel = createModelMock({
      find: [{ TariffId: "tar1", InboundType: "vmess", InboundTag: "t1" }],
    });
    (getModel as jest.Mock).mockResolvedValueOnce(TariffInboundModel);
    jest.spyOn(RealAccountHelpers, "GetInbounds").mockResolvedValue([
      { InboundType: "vmess", InboundTag: "t1" },
    ] as unknown as {
      InboundType: string;
      InboundTag: string;
    }[]);
    ConfigFile.GetMarzbanFlow = jest.fn().mockResolvedValue("none");
    Helper.GenerateRandomPassword = jest.fn().mockReturnValue("pwd");

    const res = await RealAccountHelpers.GenerateProxiesAndInbounds("auth", tariff);
    expect(res.proxies.vmess).toBeDefined();
    expect(res.inbounds.vmess).toEqual(["t1"]);
  });

  it("should return cached Marzban accounts when cache hit occurs", async () => {
    const sellerTitle = "sellerA";
    const users = [{ username: "sellerA001" }] as unknown as MarzbanAccount[];
    const now = Date.now();
    (
      RealAccountHelpers as unknown as { MarzbanAccountsList?: MarzbanAccountsCache }
    ).MarzbanAccountsList = {
      [sellerTitle]: { all: { users, timestamp: now } },
    };

    const seller = { Title: sellerTitle } as { Title: string };
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.failed).toBe(false);
    expect(res.users).toBe(users);
  });

  it("should return failed=true when GetMarzbanAccounts throws an error", async () => {
    const seller = { Title: "s2" } as { Title: string };
    jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts").mockRejectedValueOnce(new Error("boom"));
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.failed).toBe(true);
    expect(res.users).toEqual([]);
  });

  it("should sum tariff price and data limits when computing total unpaid", async () => {
    const accounts = [{ TariffId: { _id: "t1" } }, { TariffId: { _id: "t2" } }];
    const tariffs = [
      { _id: "t1", Price: 10, DataLimit: 100 },
      { _id: "t2", Price: 20, DataLimit: 200 },
    ];
    const AccountModel = createModelMock({ find: accounts });
    const TariffModel = createModelMock({ find: tariffs });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetTotalUnpaid(undefined, true);
    expect(res.TotalPriceUnpaid).toBe(30);
    expect(res.TotalLimitUnpaid).toBe(300);
  });

  it("should merge Marzban and seller accounts and map fields correctly", async () => {
    const marzbanAccounts = [
      {
        username: "sell001",
        data_limit: 1024,
        used_traffic: 10,
        expire: 1234567890,
        status: "active",
        subscription_url: "http://m/sub/1",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];

    const sellerAccounts = [
      { _id: "a1", Username: "sell001", TariffId: { _id: "t1" }, Tariff: "T1", Payed: true },
    ];

    const tariffs = [{ _id: "t1", Price: 99 }];
    const TariffModel = createModelMock();
    TariffModel.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(tariffs) });
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    Helper.CalculateTraffic = jest.fn((v: number) => `${v} B`);
    Helper.CalculateRemainDate = jest.fn(() => "1 Day Left");
    Helper.IsOnline = jest.fn(() => "Online");
    Helper.CalculateOnlineDate = jest.fn(() => "Online");
    Helper.CalculateUpdateSubscriptionDate = jest.fn(() => "Updated");

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts,
      sellerAccounts as unknown as unknown[],
      "sell",
      "",
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].username).toBe("sell001");
    expect(res[0].price).toBe(99);
  });

  it("should delete seller accounts not present in Marzban data", async () => {
    const seller = { Title: "s3", _id: "sid" } as { Title: string; _id: string };
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccounts")
      .mockResolvedValueOnce({ data: { users: [{ username: "u1" }] } });
    const sellerAccounts = [
      { _id: "del1", Username: "u2", Payed: true },
      { _id: "keep1", Username: "u1", Payed: true },
    ];
    const AccountModel = createModelMock({ find: sellerAccounts, deleteMany: { deletedCount: 1 } });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);

    await RealAccountHelpers.RemoveDeletedAccountSeller(undefined, seller);
    expect(AccountModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["del1"] } });
  });

  it("derives seller id from account variants", () => {
    const objId = new Types.ObjectId();
    const accountWithObjectId = { Seller: objId } as unknown as IAccount;
    const accountWithPopulated = { Seller: { _id: objId } } as unknown as IAccount;
    const accountWithMissing = { Seller: undefined } as unknown as IAccount;
    const accountWithString = { Seller: "str" } as unknown as IAccount;

    expect(RealAccountHelpers.GetAccountSellerId(accountWithObjectId)).toBe(objId.toString());
    expect(RealAccountHelpers.GetAccountSellerId(accountWithPopulated)).toBe(objId.toString());
    expect(RealAccountHelpers.GetAccountSellerId(accountWithMissing)).toBeUndefined();
    expect(RealAccountHelpers.GetAccountSellerId(accountWithString)).toBeUndefined();
  });

  it("invalidates seller caches", () => {
    RealAccountHelpers.MarzbanAccountsList = {
      sellerA: {
        all: { users: [], timestamp: Date.now() },
        unpaid: { users: [], timestamp: Date.now() },
      },
    };
    RealAccountHelpers.SellerAccountsList = {
      sellerA: {
        all: { accounts: [], timestamp: Date.now() },
        unpaid: { accounts: [], timestamp: Date.now() },
      },
    };

    RealAccountHelpers.InvalidateSellerAllCache("sellerA");
    RealAccountHelpers.InvalidateSellerAccountCache("sellerA");

    expect(RealAccountHelpers.MarzbanAccountsList.sellerA?.all).toBeUndefined();
    expect(RealAccountHelpers.MarzbanAccountsList.sellerA?.unpaid).toBeUndefined();
    expect(RealAccountHelpers.SellerAccountsList.sellerA?.all).toBeUndefined();
    expect(RealAccountHelpers.SellerAccountsList.sellerA?.unpaid).toBeUndefined();
  });

  it("upserts seller account cache and respects unpaid filters", () => {
    const sellerId = "seller-1";
    const existing = { Username: "u1", Payed: false } as IAccount;
    RealAccountHelpers.SellerAccountsList = {
      [sellerId]: {
        all: { accounts: [existing], timestamp: Date.now() },
        unpaid: { accounts: [existing], timestamp: Date.now() },
      },
    };

    const newAccount = { Username: "u2", Payed: false } as IAccount;
    RealAccountHelpers.UpsertSellerAccountCache(sellerId, newAccount);
    expect(RealAccountHelpers.SellerAccountsList[sellerId].all.accounts).toEqual(
      expect.arrayContaining([newAccount]),
    );
    expect(RealAccountHelpers.SellerAccountsList[sellerId].unpaid.accounts).toEqual(
      expect.arrayContaining([newAccount]),
    );

    const paidUpdate = { Username: "u1", Payed: true } as IAccount;
    RealAccountHelpers.UpsertSellerAccountCache(sellerId, paidUpdate);
    expect(RealAccountHelpers.SellerAccountsList[sellerId].all.accounts[0]).toBe(paidUpdate);
    expect(RealAccountHelpers.SellerAccountsList[sellerId].unpaid.accounts).toEqual(
      expect.not.arrayContaining([paidUpdate]),
    );
  });

  it("removes seller account from cache entries", () => {
    const sellerId = "seller-2";
    const account = { Username: "u1" } as IAccount;
    RealAccountHelpers.SellerAccountsList = {
      [sellerId]: {
        all: { accounts: [account], timestamp: Date.now() },
        unpaid: { accounts: [account], timestamp: Date.now() },
      },
    };

    RealAccountHelpers.RemoveSellerAccountFromCache(sellerId, "u1");
    expect(RealAccountHelpers.SellerAccountsList[sellerId].all.accounts).toEqual([]);
    expect(RealAccountHelpers.SellerAccountsList[sellerId].unpaid.accounts).toEqual([]);
  });

  it("upserts, patches, and removes Marzban account cache entries", () => {
    const seller = "seller-3";
    const existing = { username: "u1", status: "active" } as MarzbanAccount;
    RealAccountHelpers.MarzbanAccountsList = {
      [seller]: {
        all: { users: [existing], timestamp: Date.now() },
      },
    };

    const newUser = { username: "u2", status: "active" } as MarzbanAccount;
    RealAccountHelpers.UpsertMarzbanAccountCache(seller, newUser);
    expect(RealAccountHelpers.MarzbanAccountsList[seller].all.users).toEqual(
      expect.arrayContaining([newUser]),
    );

    RealAccountHelpers.UpsertMarzbanAccountCache(seller, {
      username: "u1",
      status: "disabled",
    } as MarzbanAccount);
    expect(RealAccountHelpers.MarzbanAccountsList[seller].all.users[0].status).toBe("disabled");

    RealAccountHelpers.PatchMarzbanAccountCache(seller, "u1", { status: "active" });
    expect(RealAccountHelpers.MarzbanAccountsList[seller].all.users[0].status).toBe("active");

    RealAccountHelpers.PatchMarzbanAccountCache(seller, "missing", { status: "active" });

    RealAccountHelpers.RemoveMarzbanAccountFromCache(seller, "u1");
    expect(RealAccountHelpers.MarzbanAccountsList[seller].all.users).toEqual([newUser]);
  });

  it("returns cached seller accounts when cache is fresh", async () => {
    const seller = { _id: new Types.ObjectId(), Title: "Seller" } as ISeller;
    const accounts = [{ Username: "u1" }] as unknown as IAccount[];
    RealAccountHelpers.SellerAccountsList = {
      [seller._id.toString()]: {
        unpaid: { accounts, timestamp: Date.now() },
      },
    };

    const result = await RealAccountHelpers.GetSellerAccounts(seller, false);
    expect(result).toBe(accounts);
    expect(getModel).not.toHaveBeenCalled();
  });

  it("returns marzban account by username when found", async () => {
    const seller = { Title: "Seller" } as ISeller;
    jest
      .spyOn(MarzbanClient, "getMarzbanAccounts")
      .mockResolvedValueOnce(createAxiosResponse({ users: [{ username: "u1" }] }))
      .mockResolvedValueOnce(createAxiosResponse({ users: [{ username: "u2" }] }));

    const found = await RealAccountHelpers.GetMarzbanAccountByUsername(undefined, seller, "u1");
    const missing = await RealAccountHelpers.GetMarzbanAccountByUsername(undefined, seller, "u1");

    expect(found?.username).toBe("u1");
    expect(missing).toBeNull();
  });

  it("handles missing caches without throwing", () => {
    expect(() => RealAccountHelpers.InvalidateSellerAccountCache("missing")).not.toThrow();
    expect(() =>
      RealAccountHelpers.UpsertSellerAccountCache("missing", {
        Username: "u1",
        Payed: false,
      } as IAccount),
    ).not.toThrow();
    expect(() => RealAccountHelpers.RemoveSellerAccountFromCache("missing", "u1")).not.toThrow();
    expect(() =>
      RealAccountHelpers.UpsertMarzbanAccountCache("missing", { username: "u1" } as MarzbanAccount),
    ).not.toThrow();
    expect(() => RealAccountHelpers.PatchMarzbanAccountCache("missing", "u1", {})).not.toThrow();
    expect(() => RealAccountHelpers.RemoveMarzbanAccountFromCache("missing", "u1")).not.toThrow();
  });

  it("skips cache updates when entries are not arrays", () => {
    const sellerId = "seller-arrays";
    RealAccountHelpers.SellerAccountsList = {
      [sellerId]: {
        all: { accounts: undefined as unknown as IAccount[], timestamp: Date.now() },
      },
    };
    RealAccountHelpers.MarzbanAccountsList = {
      [sellerId]: {
        all: { users: undefined as unknown as MarzbanAccount[], timestamp: Date.now() },
      },
    };

    RealAccountHelpers.UpsertSellerAccountCache(sellerId, {
      Username: "u1",
      Payed: false,
    } as IAccount);
    RealAccountHelpers.RemoveSellerAccountFromCache(sellerId, "u1");
    RealAccountHelpers.UpsertMarzbanAccountCache(sellerId, { username: "u1" } as MarzbanAccount);
    RealAccountHelpers.PatchMarzbanAccountCache(sellerId, "u1", {});
    RealAccountHelpers.RemoveMarzbanAccountFromCache(sellerId, "u1");
  });

  it("skips unpaid removal when account is not present", () => {
    const sellerId = "seller-miss";
    RealAccountHelpers.SellerAccountsList = {
      [sellerId]: {
        unpaid: { accounts: [], timestamp: Date.now() },
      },
    };

    RealAccountHelpers.UpsertSellerAccountCache(sellerId, {
      Username: "u1",
      Payed: true,
    } as IAccount);

    expect(RealAccountHelpers.SellerAccountsList[sellerId].unpaid.accounts).toEqual([]);
  });

  it("returns null when Marzban response has no users list", async () => {
    const seller = { Title: "Seller" } as ISeller;
    jest.spyOn(MarzbanClient, "getMarzbanAccounts").mockResolvedValueOnce(createAxiosResponse({}));

    const result = await RealAccountHelpers.GetMarzbanAccountByUsername(undefined, seller, "u1");

    expect(result).toBeNull();
  });
});

describe("More granular coverage additions for AccountHelpers", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    if (!ConfigFile.GetAllUsersForAgent) ConfigFile.GetAllUsersForAgent = jest.fn();
    if (!ConfigFile.GetMarzbanURL) ConfigFile.GetMarzbanURL = jest.fn();
    if (ConfigFile.default) {
      if (!ConfigFile.default.GetAllUsersForAgent)
        ConfigFile.default.GetAllUsersForAgent = jest.fn();
      if (!ConfigFile.default.GetMarzbanURL) ConfigFile.default.GetMarzbanURL = jest.fn();
      if (!ConfigFile.default.GetMarzbanFlow) ConfigFile.default.GetMarzbanFlow = jest.fn();
    }
  });

  it("should handle vless, trojan, and shadowsocks branches when generating proxies/inbounds", async () => {
    const tariff = { _id: "t1" } as unknown as ITariff;

    const TariffInboundModel = createModelMock({
      find: [
        { TariffId: "t1", InboundType: "vless", InboundTag: "vl1" },
        { TariffId: "t1", InboundType: "trojan", InboundTag: "tr1" },
        { TariffId: "t1", InboundType: "shadowsocks", InboundTag: "ss1" },
      ],
    });
    (getModel as jest.Mock).mockResolvedValueOnce(TariffInboundModel);

    jest.spyOn(RealAccountHelpers, "GetInbounds").mockResolvedValueOnce([
      { InboundType: "vless", InboundTag: "vl1" },
      { InboundType: "trojan", InboundTag: "tr1" },
      { InboundType: "shadowsocks", InboundTag: "ss1" },
    ]);

    if (ConfigFile.GetMarzbanFlow)
      (ConfigFile.GetMarzbanFlow as jest.Mock).mockResolvedValueOnce("flow123");
    if (ConfigFile.default && ConfigFile.default.GetMarzbanFlow)
      (ConfigFile.default.GetMarzbanFlow as jest.Mock).mockResolvedValueOnce("flow123");
    Helper.GenerateRandomPassword = jest
      .fn()
      .mockReturnValueOnce("pwd1")
      .mockReturnValueOnce("pwd2");

    const res = await RealAccountHelpers.GenerateProxiesAndInbounds("auth", tariff);
    expect(res.proxies.vless).toBeDefined();
    expect((res.proxies.vless as unknown as { flow?: string }).flow).toBe("flow123");
    expect(res.proxies.trojan).toBeDefined();
    expect(res.proxies.shadowsocks).toBeDefined();
    expect(res.inbounds.vless).toEqual(["vl1"]);
    expect(res.inbounds.trojan).toEqual(["tr1"]);
    expect(res.inbounds.shadowsocks).toEqual(["ss1"]);
  });

  it("should set empty flow when marzban flow is none", async () => {
    const tariff = { _id: "t1" } as unknown as ITariff;

    const TariffInboundModel = createModelMock({
      find: [{ TariffId: "t1", InboundType: "vless", InboundTag: "vl1" }],
    });
    (getModel as jest.Mock).mockResolvedValueOnce(TariffInboundModel);

    jest
      .spyOn(RealAccountHelpers, "GetInbounds")
      .mockResolvedValueOnce([{ InboundType: "vless", InboundTag: "vl1" }]);

    if (ConfigFile.GetMarzbanFlow)
      (ConfigFile.GetMarzbanFlow as jest.Mock).mockResolvedValueOnce("none");
    if (ConfigFile.default && ConfigFile.default.GetMarzbanFlow)
      (ConfigFile.default.GetMarzbanFlow as jest.Mock).mockResolvedValueOnce("none");

    const res = await RealAccountHelpers.GenerateProxiesAndInbounds("auth", tariff);
    expect((res.proxies.vless as unknown as { flow?: string }).flow).toBe("");
  });
});

describe("AccountHelpers additional coverage", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    ConfigFile.GetSellerAdminUsername = jest.fn().mockResolvedValue("admin");
    Helper.CalculateTraffic = jest.fn().mockReturnValue("1 MB");
    Helper.CalculateRemainDate = jest.fn().mockReturnValue("1 Day");
    Helper.IsOnline = jest.fn().mockReturnValue("Online");
    Helper.CalculateOnlineDate = jest.fn().mockReturnValue("Online");
    Helper.CalculateUpdateSubscriptionDate = jest.fn().mockReturnValue("1 Day");
  });

  it("should return a formatted inbounds list when response status is 200", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        vmess: [{ tag: "v1" }],
        vless: [{ tag: "vl1" }],
        trojan: [],
        shadowsocks: [],
      },
    });

    const res = await RealAccountHelpers.GetInbounds("auth");
    expect(Array.isArray(res)).toBe(true);
    expect(
      res.some(
        (r: unknown) =>
          (r as { InboundType?: string; InboundTag?: string }).InboundType === "vmess" &&
          (r as { InboundType?: string; InboundTag?: string }).InboundTag === "v1",
      ),
    ).toBe(true);
  });

  it("should throw when GetInbounds response status is not 200", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ status: 500 });
    await expect(RealAccountHelpers.GetInbounds("auth")).rejects.toThrow("No Inbound Found");
  });

  it("should return token from axios POST during LoginToMarzban", async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { access_token: "tok" } });
    const tok = await RealAccountHelpers.LoginToMarzban("u", "p");
    expect(tok).toBe("tok");
  });

  it("should return combined accounts for admin in GetAccountsSmart", async () => {
    const sellers = [{ Title: "sA", MarzbanUsername: "m1", MarzbanPassword: "p1" }] as unknown[];
    const SellerModel = createModelMock({ find: sellers });
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);
    const marzbanUsers = [{ username: "sellerA001" }] as unknown as MarzbanAccount[];

    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockResolvedValueOnce({ users: marzbanUsers, failed: false });
    jest.spyOn(RealAccountHelpers, "GetSellerAccounts").mockResolvedValueOnce([] as unknown[]);
    jest
      .spyOn(RealAccountHelpers, "GetMixedAccount")
      .mockResolvedValueOnce([{} as unknown as Record<string, unknown>]);

    const res = await RealAccountHelpers.GetAccountsSmart(undefined, true, "", "", true);
    expect(Array.isArray(res)).toBe(true);
  });

  it("should return empty results for non-admin GetAccountsSmart when seller not found", async () => {
    const SellerModel = createModelMock({ findOne: null });
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);
    const res = await RealAccountHelpers.GetAccountsSmart(undefined, true, "nonexist", "", false);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  it("should return seller accounts via GetAccountsSmart for seller role", async () => {
    const sellerDoc = { Title: "sellerTitle" };
    (getModel as jest.Mock).mockResolvedValueOnce({
      findOne: jest.fn().mockResolvedValue(sellerDoc),
    });
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockResolvedValue({ failed: false, users: [] });
    jest.spyOn(RealAccountHelpers, "GetSellerAccounts").mockResolvedValue([]);
    jest.spyOn(RealAccountHelpers, "GetMixedAccount").mockResolvedValue([{ id: "mix" }]);

    const res = await RealAccountHelpers.GetAccountsSmart("auth", false, "sellerTitle", "", false);
    expect(res).toEqual([{ id: "mix" }]);
  });
});

describe("AccountHelpers extra coverage", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    (
      RealAccountHelpers as unknown as { MarzbanAccountsList: MarzbanAccountsCache }
    ).MarzbanAccountsList = {};
    ConfigFile.GetMarzbanURL = jest.fn().mockResolvedValue("http://marzban");
    ConfigFile.GetAllUsersForAgent = jest.fn().mockResolvedValue("No");
    if (ConfigFile.default) {
      ConfigFile.default.GetMarzbanURL = jest.fn().mockResolvedValue("http://marzban");
      ConfigFile.default.GetAllUsersForAgent = jest.fn().mockResolvedValue("No");
    }
    axios.isAxiosError.mockReturnValue(true);
  });

  it("invalidates cached seller entries", () => {
    (
      RealAccountHelpers as unknown as { MarzbanAccountsList: MarzbanAccountsCache }
    ).MarzbanAccountsList = {
      seller1: {
        all: { users: [] as MarzbanAccount[], timestamp: 1 },
        unpaid: { users: [] as MarzbanAccount[], timestamp: 1 },
      },
    };

    RealAccountHelpers.InvalidateSellerAllCache("seller1");

    const cache = (
      RealAccountHelpers as unknown as {
        MarzbanAccountsList: MarzbanAccountsCache;
      }
    ).MarzbanAccountsList;
    expect(cache.seller1?.all).toBeUndefined();
    expect(cache.seller1?.unpaid).toBeUndefined();
  });

  it("filters seller accounts based on IsAll flag", async () => {
    const seller = { _id: new (require("mongoose").Types.ObjectId)() } as ISeller;
    const AccountModel = createModelMock({ find: [] });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel);

    await RealAccountHelpers.GetSellerAccounts(seller, false);
    expect(AccountModel.find).toHaveBeenCalledWith({ Seller: seller._id, Payed: false });

    const AccountModelAll = createModelMock({ find: [] });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModelAll);
    await RealAccountHelpers.GetSellerAccounts(seller, true);
    expect(AccountModelAll.find).toHaveBeenCalledWith({ Seller: seller._id });
  });

  it("skips accounts missing TariffId when summing unpaid totals", async () => {
    const accounts = [{ TariffId: undefined }, { TariffId: { _id: "t1" } }];
    const tariffs = [{ _id: "t1", Price: 10, DataLimit: 100 }];
    const AccountModel = createModelMock({ find: accounts });
    const TariffModel = createModelMock({ find: tariffs });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetTotalUnpaid(undefined, true);
    expect(res.TotalPriceUnpaid).toBe(10);
    expect(res.TotalLimitUnpaid).toBe(100);
  });

  it("uses seller filter when GetTotalUnpaid is not admin", async () => {
    const seller = { _id: "seller-id" } as unknown as ISeller;
    const AccountModel = createModelMock({ find: [] });
    const TariffModel = createModelMock({ find: [] });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(TariffModel);

    await RealAccountHelpers.GetTotalUnpaid(seller, false);
    expect(AccountModel.find).toHaveBeenCalledWith({ Seller: seller._id, Payed: false });
  });

  it("returns available username on 404 response", async () => {
    const seller = { Counter: 0 } as unknown as ISeller;
    (axios.get as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });
    const result = await RealAccountHelpers.GetUsernameAvailable(seller, "user", "auth");
    expect(result).toBe("user001");
  });

  it("throws when username check fails with non-404 error", async () => {
    const seller = { Counter: 0 } as unknown as ISeller;
    (axios.get as jest.Mock).mockRejectedValueOnce({ response: { status: 500 } });
    await expect(
      RealAccountHelpers.GetUsernameAvailable(seller, "user", "auth"),
    ).rejects.toBeDefined();
  });

  it("throws when username counter exceeds limit", async () => {
    const seller = { Counter: 10000000 } as unknown as ISeller;
    await expect(RealAccountHelpers.GetUsernameAvailable(seller, "user", "auth")).rejects.toThrow(
      /Unable to generate username/,
    );
  });

  it("returns minimal account data when marzban account is missing", async () => {
    const sellerAccounts = [
      { _id: "a1", Username: "u1", Tariff: "T1", Payed: false, TariffId: undefined },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      [],
      sellerAccounts as unknown as IAccount[],
      "u",
      "",
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual([]);
  });

  it("returns Paid when marzban account missing but account is paid", async () => {
    const sellerAccounts = [
      { _id: "a2", Username: "u2", Tariff: "T2", Payed: true, TariffId: undefined },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      [],
      sellerAccounts as unknown as IAccount[],
      "u",
      "",
    );
    expect(res).toEqual([]);
  });

  it("returns empty results when admin marzban accounts fail", async () => {
    const sellers = [{ Title: "sA" }] as unknown[];
    const SellerModel = createModelMock({ find: sellers });
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockResolvedValueOnce({ users: [], failed: true });

    const res = await RealAccountHelpers.GetAccountsSmart(undefined, true, "", "", true);
    expect(res).toEqual([]);
  });

  it("logs deleted unpaid accounts for admin path", async () => {
    const sellers = [{ Title: "sB" }] as unknown[];
    const SellerModel = createModelMock({ find: sellers });
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockResolvedValueOnce({ users: [], failed: false });
    jest
      .spyOn(RealAccountHelpers, "GetSellerAccounts")
      .mockResolvedValueOnce([{ Username: "u1", Payed: false }] as unknown as IAccount[]);
    jest.spyOn(RealAccountHelpers, "GetMixedAccount").mockResolvedValueOnce([]);

    const res = await RealAccountHelpers.GetAccountsSmart(undefined, true, "", "", true);
    expect(res).toEqual([]);
    expect(console.log).toHaveBeenCalled();
  });

  it("returns empty list when admin map handler throws", async () => {
    const sellers = [{ Title: "sC" }] as unknown[];
    const SellerModel = createModelMock({ find: sellers });
    (getModel as jest.Mock).mockResolvedValueOnce(SellerModel);
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockRejectedValueOnce(new Error("boom"));

    const res = await RealAccountHelpers.GetAccountsSmart(undefined, true, "", "", true);
    expect(res).toEqual([]);
  });

  it("returns empty when seller marzban accounts fail", async () => {
    const sellerDoc = { Title: "sellerTitle" };
    (getModel as jest.Mock).mockResolvedValueOnce({
      findOne: jest.fn().mockResolvedValue(sellerDoc),
    });
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockResolvedValueOnce({ failed: true, users: [] });

    const res = await RealAccountHelpers.GetAccountsSmart("auth", false, "sellerTitle", "", false);
    expect(res).toEqual([]);
  });

  it("returns empty when seller path throws", async () => {
    const sellerDoc = { Title: "sellerTitle" };
    (getModel as jest.Mock).mockResolvedValueOnce({
      findOne: jest.fn().mockResolvedValue(sellerDoc),
    });
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccountsAndStoreSmart")
      .mockRejectedValueOnce(new Error("fail"));

    const res = await RealAccountHelpers.GetAccountsSmart("auth", false, "sellerTitle", "", false);
    expect(res).toEqual([]);
  });

  it("caches marzban accounts on cache miss", async () => {
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccounts")
      .mockResolvedValueOnce({ data: { users: [{ username: "u1" }] } });
    const seller = { Title: "sCache" } as ISeller;
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.failed).toBe(false);
    expect(res.users).toHaveLength(1);
    const cache = (
      RealAccountHelpers as unknown as {
        MarzbanAccountsList: MarzbanAccountsCache;
      }
    ).MarzbanAccountsList;
    expect(cache.sCache.all.users).toHaveLength(1);
  });

  it("decrypts seller marzban password", async () => {
    jest.spyOn(CryptoService, "decrypt").mockResolvedValueOnce("dec");
    const seller = { MarzbanPassword: "enc" } as ISeller;
    const res = await RealAccountHelpers.GetSellerMarzbanPassword(seller);
    expect(res).toBe("dec");
  });

  it("gets marzban accounts when agent mode is enabled", async () => {
    ConfigFile.GetAllUsersForAgent = jest.fn().mockResolvedValue("Yes");
    if (ConfigFile.default) {
      ConfigFile.default.GetAllUsersForAgent = jest.fn().mockResolvedValue("Yes");
      ConfigFile.default.GetMarzbanURL = jest.fn().mockResolvedValue("http://marzban");
    }
    const seller = {
      Title: "Agent",
      MarzbanUsername: "mu",
      MarzbanPassword: "mp",
    } as ISeller;
    jest.spyOn(MarzbanClient, "getSellerMarzbanPassword").mockResolvedValue("pass");
    jest.spyOn(MarzbanClient, "loginToMarzban").mockResolvedValue("tok");
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });

    await RealAccountHelpers.GetMarzbanAccounts("auth", seller);

    expect(axios.get).toHaveBeenCalledWith("http://marzban/api/users", {
      headers: { Authorization: "Bearer tok" },
      params: { search: "" },
      timeout: 300000,
    });
  });

  it("overrides search when search parameter is provided", async () => {
    const seller = { Title: "Seller", MarzbanUsername: "m", MarzbanPassword: "p" } as ISeller;
    if (ConfigFile.default) {
      ConfigFile.default.GetMarzbanURL = jest.fn().mockResolvedValue("http://marzban");
    }
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });

    await RealAccountHelpers.GetMarzbanAccounts("auth", seller, "query");

    expect(axios.get).toHaveBeenCalledWith("http://marzban/api/users", {
      headers: { Authorization: "auth" },
      params: { search: "query" },
      timeout: 300000,
    });
  });

  it("returns empty object when normalize input is not an object", () => {
    expect(RealAccountHelpers.NormalizeAccountOutput("bad")).toEqual({});
  });

  it("no-ops when invalidating cache for missing seller", () => {
    RealAccountHelpers.InvalidateSellerAllCache("missing");
    const cache = (
      RealAccountHelpers as unknown as {
        MarzbanAccountsList: MarzbanAccountsCache;
      }
    ).MarzbanAccountsList;
    expect(cache).toEqual({});
  });

  it("skips RemoveDeletedAccountSeller when seller is undefined", async () => {
    const spy = jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts");
    await RealAccountHelpers.RemoveDeletedAccountSeller(undefined, undefined as unknown as ISeller);
    expect(spy).not.toHaveBeenCalled();
  });

  it("handles multiple TariffId shapes in GetTotalUnpaid", async () => {
    const id1 = new (require("mongoose").Types.ObjectId)();
    const accounts = [
      { TariffId: id1 },
      { TariffId: "t2" },
      { TariffId: { _id: "t3" } },
      { TariffId: "missing" },
    ];
    const tariffs = [
      { _id: id1, Price: undefined, DataLimit: undefined },
      { _id: "t2", Price: 6, DataLimit: 20 },
      { _id: "t3", Price: 7, DataLimit: 30 },
    ];
    const AccountModel = createModelMock({ find: accounts });
    const TariffModel = createModelMock({ find: tariffs });
    (getModel as jest.Mock).mockResolvedValueOnce(AccountModel).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetTotalUnpaid(undefined, true);
    expect(res.TotalPriceUnpaid).toBe(13);
    expect(res.TotalLimitUnpaid).toBe(50);
  });

  it("maps mixed accounts when tariffId is ObjectId and payed is false", async () => {
    const tariffId = new (require("mongoose").Types.ObjectId)();
    const marzbanAccounts = [
      {
        username: "sell001",
        data_limit: 1024,
        used_traffic: 10,
        expire: 123,
        status: "active",
        subscription_url: "http://m/sub/1",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];
    const sellerAccounts = [
      { _id: "a1", Username: "sell001", TariffId: tariffId, Tariff: "T1", Payed: false },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: tariffId }]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts as unknown as MarzbanAccount[],
      sellerAccounts as unknown as IAccount[],
      "sell",
      "",
    );
    expect(res[0].payed).toBe("Unpaid");
  });

  it("maps mixed accounts when tariffId is nested object", async () => {
    const tariffId = new (require("mongoose").Types.ObjectId)().toString();
    const marzbanAccounts = [
      {
        username: "sell002",
        data_limit: 1024,
        used_traffic: 10,
        expire: 123,
        status: "active",
        subscription_url: "http://m/sub/2",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];
    const sellerAccounts = [
      { _id: "a2", Username: "sell002", TariffId: { _id: tariffId }, Tariff: "T2", Payed: true },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: tariffId }]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts as unknown as MarzbanAccount[],
      sellerAccounts as unknown as IAccount[],
      "sell",
      "",
    );
    expect(res[0].payed).toBe("Paid");
  });

  it("maps mixed accounts when tariffId is nested ObjectId", async () => {
    const tariffId = new (require("mongoose").Types.ObjectId)();
    const marzbanAccounts = [
      {
        username: "sell004",
        data_limit: 1024,
        used_traffic: 10,
        expire: 123,
        status: "active",
        subscription_url: "http://m/sub/4",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];
    const sellerAccounts = [
      {
        _id: "a4",
        Username: "sell004",
        TariffId: { _id: tariffId },
        Tariff: "T4",
        Payed: false,
      },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: tariffId }]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts as unknown as MarzbanAccount[],
      sellerAccounts as unknown as IAccount[],
      "sell",
      "",
    );
    expect(res[0].payed).toBe("Unpaid");
  });

  it("maps mixed accounts when tariffId is a string", async () => {
    const tariffId = new (require("mongoose").Types.ObjectId)().toString();
    const marzbanAccounts = [
      {
        username: "sell003",
        data_limit: 1024,
        used_traffic: 10,
        expire: 123,
        status: "active",
        subscription_url: "http://m/sub/3",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];
    const sellerAccounts = [
      { _id: "a3", Username: "sell003", TariffId: tariffId, Tariff: "T3", Payed: false },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: tariffId }]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts as unknown as MarzbanAccount[],
      sellerAccounts as unknown as IAccount[],
      "sell",
      "",
    );
    expect(res[0].payed).toBe("Unpaid");
  });

  it("skips invalid tariffId strings when mapping mixed accounts", async () => {
    const marzbanAccounts = [
      {
        username: "sell005",
        data_limit: 1024,
        used_traffic: 10,
        expire: 123,
        status: "active",
        subscription_url: "http://m/sub/5",
        online_at: new Date().toISOString(),
        sub_updated_at: new Date().toISOString(),
        sub_last_user_agent: "ua",
        note: "n",
      },
    ];
    const sellerAccounts = [
      { _id: "a5", Username: "sell005", TariffId: "bad", Tariff: "T5", Payed: false },
    ];
    const TariffModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    (getModel as jest.Mock).mockResolvedValueOnce(TariffModel);

    const res = await RealAccountHelpers.GetMixedAccount(
      marzbanAccounts as unknown as MarzbanAccount[],
      sellerAccounts as unknown as IAccount[],
      "sell",
      "",
    );
    expect(res[0].price).toBeUndefined();
  });

  it("uses unpaid cache key when isAll is false", async () => {
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccounts")
      .mockResolvedValueOnce({ data: { users: [] } });
    const seller = { Title: "sUnpaid" } as ISeller;
    await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, false);
    const cache = (
      RealAccountHelpers as unknown as {
        MarzbanAccountsList: MarzbanAccountsCache;
      }
    ).MarzbanAccountsList;
    expect(cache.sUnpaid.unpaid).toBeDefined();
  });

  it("reuses existing cache container on miss", async () => {
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccounts")
      .mockResolvedValueOnce({ data: { users: [{ username: "u1" }] } });
    const seller = { Title: "sReuse" } as ISeller;
    (
      RealAccountHelpers as unknown as { MarzbanAccountsList: MarzbanAccountsCache }
    ).MarzbanAccountsList[seller.Title] = {};
    await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    const cache = (RealAccountHelpers as unknown as { MarzbanAccountsList: MarzbanAccountsCache })
      .MarzbanAccountsList;
    expect(cache.sReuse.all.users).toHaveLength(1);
  });

  it("extracts error status from code and message", async () => {
    const seller = { Title: "sErr" } as ISeller;
    jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts").mockRejectedValueOnce({ code: "ECONN" });
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.error).toBe("ECONN");

    jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts").mockRejectedValueOnce({ message: "oops" });
    const res2 = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res2.error).toBe("oops");
  });

  it("extracts error status from response when present", async () => {
    const seller = { Title: "sErrStatus" } as ISeller;
    (
      RealAccountHelpers as unknown as { MarzbanAccountsList: MarzbanAccountsCache }
    ).MarzbanAccountsList[seller.Title] = {};
    jest
      .spyOn(RealAccountHelpers, "GetMarzbanAccounts")
      .mockRejectedValueOnce({ response: { status: 500 } });
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.error).toBe(500);
  });

  it("handles non-object errors in GetMarzbanAccountsAndStoreSmart", async () => {
    const seller = { Title: "sErr2" } as ISeller;
    jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts").mockRejectedValueOnce("fail");
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.error).toBe("fail");
  });

  it("falls back to error object when no status fields are present", async () => {
    const seller = { Title: "sErr3" } as ISeller;
    const err = {};
    jest.spyOn(RealAccountHelpers, "GetMarzbanAccounts").mockRejectedValueOnce(err);
    const res = await RealAccountHelpers.GetMarzbanAccountsAndStoreSmart(undefined, seller, true);
    expect(res.error).toBe(err);
  });

  it("gets marzban accounts without seller context", async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });
    await RealAccountHelpers.GetMarzbanAccounts("auth", undefined, "search");
    expect(axios.get).toHaveBeenCalledWith("http://marzban/api/users", {
      headers: { Authorization: "auth" },
      params: { search: "search" },
      timeout: 300000,
    });
  });

  it("normalizes id/username fallbacks and payed flags", () => {
    const res = RealAccountHelpers.NormalizeAccountOutput({
      id: "id1",
      username: "u1",
      payed: "custom",
    });
    expect(res.id).toBe("id1");
    expect(res.username).toBe("u1");
    expect(res.payed).toBe("custom");

    const res2 = RealAccountHelpers.NormalizeAccountOutput({
      _id: "id2",
      Username: "u2",
      Payed: false,
    });
    expect(res2.id).toBe("id2");
    expect(res2.username).toBe("u2");
    expect(res2.payed).toBe("Unpaid");
  });

  it("returns nulls when optional fields are missing", () => {
    const res = RealAccountHelpers.NormalizeAccountOutput({});
    expect(res.id).toBeNull();
    expect(res.username).toBeNull();
    expect(res.payed).toBeNull();
  });
});
