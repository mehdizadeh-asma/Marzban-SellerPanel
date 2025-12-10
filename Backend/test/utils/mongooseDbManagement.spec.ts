export {};
// --- merged from mongooseDbManagement.additional.spec.ts ---
export {};

const MongooseDbManagement = require("../../src/utils/MongooseDbManagement").default;

describe("MongooseDbManagement utils", () => {
  it("should return expected pattern for DB panel connection string", () => {
    const s = MongooseDbManagement.getDbPanelConnectionString();
    expect(s).toContain("mongodb.net");
    expect(s).toContain("MarzbanSellerPanel");
  });

  it("should set and get the DbWholeSalerConnectionString", () => {
    MongooseDbManagement.setDbWholeSalerConnectionString("cluster", "db", "u", "p");
    const s = MongooseDbManagement.getDbWholeSalerConnectionString();
    expect(s).toContain("cluster");
    expect(s).toContain("db");
  });
});

// --- merged from more_coverage.spec.ts ---
describe("More granular coverage additions for MongooseDbManagement", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should throw when copying database if mainConnection is null", async () => {
    // ensure mainConnection null
    (MongooseDbManagement as unknown as { mainConnection: unknown }).mainConnection = null;
    await expect(MongooseDbManagement.copyDatabase("some")).rejects.toThrow(
      /اتصال به دیتابیس اصلی/,
    );
  });
});

jest.mock("../../src/utils/Config");

const ConfigFile = require("../../src/utils/Config");

/* eslint-disable no-unused-vars */
type MongooseDbManagementInternal = Partial<{
  dbWholeSalerConnectionString: string;
  activeConnections: Map<string, unknown>;
  mainConnection: unknown | null;
  connectionCleanupInterval: unknown | null;
  getConnection: (..._args: unknown[]) => Promise<unknown>;
  copyCollection: (..._args: unknown[]) => Promise<unknown>;
}>;
/* eslint-enable no-unused-vars */

describe("MongooseDbManagement additional coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // ensure ConfigFile mock functions exist
    if (!ConfigFile.GetMarzbanURL) ConfigFile.GetMarzbanURL = jest.fn();
    if (!ConfigFile.GetSerialKey) ConfigFile.GetSerialKey = jest.fn();
    // reset internal state
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).dbWholeSalerConnectionString =
      "";
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).activeConnections = new Map();
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).mainConnection = null;
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).connectionCleanupInterval =
      null;
  });

  it("should return true and set connection string when WholeSaler exists and is not expired", async () => {
    (ConfigFile.GetMarzbanURL as jest.Mock).mockResolvedValueOnce("http://m.test");
    (ConfigFile.GetSerialKey as jest.Mock).mockResolvedValueOnce("SN123");

    const fakeConnection = {
      model: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({
          ExpireDate: new Date(Date.now() + 1000 * 60 * 60),
          Cluster: "cl",
          Database: "db",
          DbUsername: "u",
          DbPassword: "p",
        }),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock getConnection to return our fake connection
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).getConnection = jest
      .fn()
      .mockResolvedValue(fakeConnection as unknown);

    const res = await MongooseDbManagement.checkLicense();
    expect(res).toBe(true);
    const connStr = MongooseDbManagement.getDbWholeSalerConnectionString();
    expect(connStr).toContain("cl");
    expect(
      (MongooseDbManagement as unknown as MongooseDbManagementInternal).getConnection,
    ).toHaveBeenCalled();
  });

  it("should return false when WholeSaler is not found", async () => {
    (ConfigFile.GetMarzbanURL as jest.Mock).mockResolvedValueOnce("http://m.test");
    (ConfigFile.GetSerialKey as jest.Mock).mockResolvedValueOnce("SN123");

    const fakeConnection = {
      model: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).getConnection = jest
      .fn()
      .mockResolvedValue(fakeConnection);

    const res = await MongooseDbManagement.checkLicense();
    expect(res).toBe(false);
  });

  it("should return early when copying a collection with no documents", async () => {
    const sourceModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    };
    const targetModel = { insertMany: jest.fn().mockResolvedValue([]) };

    // call private method via internal access
    await (MongooseDbManagement as unknown as MongooseDbManagementInternal).copyCollection!(
      sourceModel,
      targetModel,
      "TestCollection",
    );
    expect(sourceModel.find).toHaveBeenCalled();
    expect(targetModel.insertMany).not.toHaveBeenCalled();
  });

  it("should throw when copyCollection insertMany fails", async () => {
    const docs = [{ a: 1 }];
    const sourceModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(docs) }),
    };
    const targetModel = { insertMany: jest.fn().mockRejectedValue(new Error("insert fail")) };

    await expect(
      (MongooseDbManagement as unknown as MongooseDbManagementInternal).copyCollection!(
        sourceModel,
        targetModel,
        "X",
      ),
    ).rejects.toThrow(/کپی X ناموفق/);
  });

  it("should skip closing mainConnection and close other connections", async () => {
    const connStr = "mongodb://example";
    const fakeMain = { client: { s: { url: connStr } } };
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).mainConnection = fakeMain;

    // should skip closing main
    await MongooseDbManagement.closeConnection(connStr);

    // now set another connection in activeConnections and ensure close called
    const fakeConn = { close: jest.fn().mockResolvedValue(undefined), readyState: 1 };
    (MongooseDbManagement as unknown as MongooseDbManagementInternal).activeConnections!.set(
      "other",
      fakeConn,
    );

    await MongooseDbManagement.closeConnection("other");
    expect(fakeConn.close).toHaveBeenCalled();
    expect(
      (MongooseDbManagement as unknown as MongooseDbManagementInternal).activeConnections!.has(
        "other",
      ),
    ).toBe(false);
  });
});
