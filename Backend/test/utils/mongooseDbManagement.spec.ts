import { EventEmitter } from "events";

import type { Connection } from "mongoose";

const configMock = {
  GetPanelDbCluster: jest.fn().mockResolvedValue("panelCluster"),
  GetPanelDbDatabase: jest.fn().mockResolvedValue("MarzbanSellerPanel"),
  GetPanelDbUsername: jest.fn().mockResolvedValue("panelUser"),
  GetPanelDbPassword: jest.fn().mockResolvedValue("panelPass"),
  GetMarzbanURL: jest.fn().mockResolvedValue("http://marzban"),
  GetSerialKey: jest.fn().mockResolvedValue("serial"),
};

jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: configMock,
}));

const createConnectionMock = jest.fn((connectionString: string): Connection & EventEmitter => {
  const emitter = new EventEmitter() as unknown as Connection &
    EventEmitter & {
      close: jest.Mock;
      model: jest.Mock;
      client: { s: { url: string } };
    };
  (emitter as unknown as { readyState: number }).readyState = 1;
  emitter.close = jest.fn().mockResolvedValue(undefined);
  emitter.model = jest.fn().mockReturnValue({
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  });
  emitter.client = { s: { url: connectionString } };
  process.nextTick(() => emitter.emit("connected"));
  return emitter;
});

jest.mock("mongoose", () => {
  class Schema {
    constructor() {
      // noop mock
    }
  }
  const mock = {
    createConnection: createConnectionMock,
    ConnectionStates: { connected: 1 },
    Types: { ObjectId: class ObjectId {} },
    Schema,
  };
  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

const MongooseDbManagement = require("../../src/db/MongooseDbManagement").default;

type InternalState = {
  dbWholeSalerConnectionString: string;
  activeConnections: Map<string, Connection>;
  mainConnection: Connection | null;
  connectionCleanupInterval: NodeJS.Timeout | null;
  connectionLastUsedMap: WeakMap<Connection, number>;
};

const internal = MongooseDbManagement as unknown as InternalState;
const originalEnv = process.env;

const resetInternals = (): void => {
  internal.dbWholeSalerConnectionString = "";
  internal.activeConnections = new Map();
  internal.mainConnection = null;
  internal.connectionLastUsedMap = new WeakMap();
  if (internal.connectionCleanupInterval) {
    clearInterval(internal.connectionCleanupInterval);
    internal.connectionCleanupInterval = null;
  }
};

describe("MongooseDbManagement utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInternals();
    process.env = { ...originalEnv };
    process.env.PANEL_DB_CLUSTER = "panelCluster";
    process.env.PANEL_DB_DATABASE = "MarzbanSellerPanel";
    process.env.PANEL_DB_USERNAME = "panelUser";
    process.env.PANEL_DB_PASSWORD = "panelPass";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Connection string helpers", () => {
    it("builds panel connection string using env", async () => {
      const conn = await MongooseDbManagement.getDbPanelConnectionString();
      expect(conn).toContain("mongodb.net");
      expect(conn).toContain("MarzbanSellerPanel");
    });

    it("sets and retrieves wholesaler connection string", () => {
      MongooseDbManagement.setDbWholeSalerConnectionString("cluster", "db", "user", "pass");
      expect(MongooseDbManagement.getDbWholeSalerConnectionString()).toContain("cluster");
      expect(MongooseDbManagement.getDbWholeSalerConnectionString()).toContain("db");
    });
  });

  describe("connectMainDatabase", () => {
    it("throws when wholesaler connection string is missing", async () => {
      await expect(MongooseDbManagement.connectMainDatabase()).rejects.toThrow(
        /connection string not configured/,
      );
    });

    it("connects when connection string exists", async () => {
      MongooseDbManagement.setDbWholeSalerConnectionString("cluster", "db", "user", "pass");
      const expectedConnectionString = MongooseDbManagement.getDbWholeSalerConnectionString();
      await MongooseDbManagement.connectMainDatabase();
      expect(createConnectionMock).toHaveBeenCalledWith(
        expectedConnectionString,
        expect.objectContaining({ maxPoolSize: 15 }),
      );
      expect(internal.mainConnection).not.toBeNull();
    });

    it("skips reconnect when already connected", async () => {
      internal.mainConnection = { readyState: 1 } as unknown as Connection;
      await MongooseDbManagement.connectMainDatabase();
      expect(createConnectionMock).not.toHaveBeenCalled();
    });
  });

  describe("getConnection", () => {
    it("returns cached connection", async () => {
      const cached = { readyState: 1 } as unknown as Connection;
      internal.activeConnections.set("conn", cached);
      const result = await MongooseDbManagement.getConnection("conn", "Name");
      expect(result).toBe(cached);
    });

    it("creates connection when cache miss", async () => {
      await MongooseDbManagement.getConnection("conn2", "Name", 5);
      expect(createConnectionMock).toHaveBeenCalledWith(
        "conn2",
        expect.objectContaining({ maxPoolSize: 5 }),
      );
    });
  });

  describe("checkLicense", () => {
    it("returns true when license record is valid", async () => {
      const fakeConnection = {
        model: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            ExpireDate: new Date(Date.now() + 1000),
            Cluster: "cluster",
            Database: "db",
            DbUsername: "user",
            DbPassword: "pass",
          }),
        }),
        close: jest.fn(),
      };

      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(fakeConnection);

      const result = await MongooseDbManagement.checkLicense();
      expect(result).toBe(true);
      expect(MongooseDbManagement.getDbWholeSalerConnectionString()).toContain("cluster");

      getConnectionSpy.mockRestore();
    });

    it("returns false when no license record", async () => {
      const fakeConnection = {
        model: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
        close: jest.fn(),
      };

      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(fakeConnection);

      const result = await MongooseDbManagement.checkLicense();
      expect(result).toBe(false);

      getConnectionSpy.mockRestore();
    });

    it("logs when closing license connection fails", async () => {
      const fakeConnection = {
        model: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
        close: jest.fn(),
      };

      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(fakeConnection);
      const closeConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { closeConnection: jest.Mock }, "closeConnection")
        .mockRejectedValue(new Error("close fail"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await MongooseDbManagement.checkLicense();
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      getConnectionSpy.mockRestore();
      closeConnectionSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("copyDatabase", () => {
    it("copies collections to target connection", async () => {
      const createSourceModel = (name: string) => ({
        find: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: `${name}-id` }]),
        }),
      });

      internal.mainConnection = {
        model: jest.fn((name: string) => createSourceModel(name)),
      } as unknown as Connection;

      const insertManyMock = jest.fn().mockResolvedValue(undefined);
      const targetConnection = {
        model: jest.fn().mockReturnValue({ insertMany: insertManyMock }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(targetConnection);
      const closeConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { closeConnection: jest.Mock }, "closeConnection")
        .mockResolvedValue(undefined);

      await MongooseDbManagement.copyDatabase("mongodb://dest");
      expect(insertManyMock).toHaveBeenCalled();
      expect(targetConnection.model).toHaveBeenCalled();
      expect(closeConnectionSpy).toHaveBeenCalledWith("mongodb://dest");

      getConnectionSpy.mockRestore();
      closeConnectionSpy.mockRestore();
    });
  });

  describe("shutdown", () => {
    it("closes all connections and clears interval", async () => {
      const fakeConn = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as Connection;
      internal.activeConnections.set("conn", fakeConn);
      internal.mainConnection = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as Connection;
      internal.connectionCleanupInterval = setInterval(() => undefined, 1000);

      await MongooseDbManagement.shutdown();
      expect(fakeConn.close).toHaveBeenCalled();
      expect(internal.activeConnections.size).toBe(0);
      expect(internal.mainConnection).toBeNull();
      expect(internal.connectionCleanupInterval).toBeNull();
    });
  });

  describe("closeConnection", () => {
    it("skips closing when connection is main", async () => {
      const connStr = "mongodb://main";
      internal.mainConnection = { client: { s: { url: connStr } } } as unknown as Connection;
      await MongooseDbManagement.closeConnection(connStr);
    });

    it("logs error when closing connection fails", async () => {
      const connStr = "mongodb://fail";
      const failingConn = {
        close: jest.fn().mockRejectedValue(new Error("close fail")),
      } as unknown as Connection;
      internal.activeConnections.set(connStr, failingConn);
      await MongooseDbManagement.closeConnection(connStr);
      expect(failingConn.close).toHaveBeenCalled();
    });
  });

  describe("additional coverage", () => {
    it("returns connection options with minPoolSize capped", () => {
      const getConnectionOptions = (
        MongooseDbManagement as unknown as {
          getConnectionOptions: (_poolSize: number) => { minPoolSize: number; maxPoolSize: number };
        }
      ).getConnectionOptions;

      const defaults = getConnectionOptions(undefined as unknown as number);
      expect(defaults.maxPoolSize).toBe(10);
      expect(defaults.minPoolSize).toBe(5);

      const small = getConnectionOptions(3);
      expect(small.maxPoolSize).toBe(3);
      expect(small.minPoolSize).toBe(3);

      const large = getConnectionOptions(10);
      expect(large.maxPoolSize).toBe(10);
      expect(large.minPoolSize).toBe(5);
    });

    it("returns main connection when set", () => {
      const conn = { readyState: 1 } as unknown as Connection;
      internal.mainConnection = conn;
      expect(MongooseDbManagement.getMainConnection()).toBe(conn);
    });

    it("closes stale mainConnection even when close fails", async () => {
      const stale = {
        readyState: 0,
        close: jest.fn().mockRejectedValue(new Error("close fail")),
      } as unknown as Connection;
      internal.mainConnection = stale;
      MongooseDbManagement.setDbWholeSalerConnectionString("cluster", "db", "user", "pass");
      await MongooseDbManagement.connectMainDatabase();
      expect(internal.mainConnection).not.toBeNull();
    });

    it("throws when connectMainDatabase cannot create connection", async () => {
      MongooseDbManagement.setDbWholeSalerConnectionString("cluster", "db", "user", "pass");
      createConnectionMock.mockImplementationOnce(() => {
        throw new Error("connect fail");
      });
      await expect(MongooseDbManagement.connectMainDatabase()).rejects.toThrow("connect fail");
    });

    it("rejects when connection emits error", async () => {
      createConnectionMock.mockImplementationOnce((connectionString: string) => {
        const emitter = new EventEmitter() as unknown as Connection &
          EventEmitter & {
            client: { s: { url: string } };
          };
        emitter.client = { s: { url: connectionString } };
        process.nextTick(() => emitter.emit("error", new Error("boom")));
        return emitter;
      });

      await expect(MongooseDbManagement.getConnection("conn", "Name")).rejects.toThrow("boom");
    });

    it("handles non-error arguments in connection error handler", async () => {
      createConnectionMock.mockImplementationOnce((connectionString: string) => {
        const emitter = new EventEmitter() as unknown as Connection &
          EventEmitter & {
            client: { s: { url: string } };
          };
        emitter.client = { s: { url: connectionString } };
        process.nextTick(() => emitter.emit("error", "bad"));
        return emitter;
      });

      await expect(MongooseDbManagement.getConnection("conn2", "Name")).rejects.toThrow("bad");
    });

    it("rejects when connection times out", async () => {
      jest.useFakeTimers();
      createConnectionMock.mockImplementationOnce((connectionString: string) => {
        const emitter = new EventEmitter() as unknown as Connection &
          EventEmitter & {
            client: { s: { url: string } };
          };
        emitter.client = { s: { url: connectionString } };
        return emitter;
      });

      const promise = (
        MongooseDbManagement as unknown as {
          createConnection: (
            _conn: string,
            _name: string,
            _options: { connectTimeoutMS: number },
          ) => Promise<Connection>;
        }
      ).createConnection("conn-timeout", "Timeout", { connectTimeoutMS: 1 });

      jest.advanceTimersByTime(5);
      await expect(promise).rejects.toThrow("Connection timed out");
      jest.useRealTimers();
    });

    it("uses default timeout when connectTimeoutMS is invalid", async () => {
      createConnectionMock.mockImplementationOnce((connectionString: string) => {
        const emitter = new EventEmitter() as unknown as Connection &
          EventEmitter & {
            client: { s: { url: string } };
          };
        emitter.client = { s: { url: connectionString } };
        process.nextTick(() => emitter.emit("connected"));
        return emitter;
      });

      const conn = await (
        MongooseDbManagement as unknown as {
          createConnection: (
            _conn: string,
            _name: string,
            _options: { connectTimeoutMS: unknown },
          ) => Promise<Connection>;
        }
      ).createConnection("conn-default", "Default", { connectTimeoutMS: "bad" });

      expect(conn).toBeDefined();
    });

    it("skips initConnectionCleanup when interval already exists", async () => {
      const interval = setInterval(() => undefined, 1000);
      internal.connectionCleanupInterval = interval;
      await MongooseDbManagement.getConnection("conn-skip", "Skip");
      expect(internal.connectionCleanupInterval).toBe(interval);
      clearInterval(interval);
      internal.connectionCleanupInterval = null;
    });

    it("runs connection cleanup for idle connections", async () => {
      jest.useFakeTimers();
      const idleConnection = {
        readyState: 1,
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as Connection;
      internal.activeConnections.set("idle", idleConnection);
      internal.connectionLastUsedMap.set(idleConnection, Date.now() - 10 * 60 * 1000);

      const closeSpy = jest
        .spyOn(MongooseDbManagement as unknown as { closeConnection: jest.Mock }, "closeConnection")
        .mockResolvedValue(undefined);

      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();
      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();

      jest.advanceTimersByTime(30000);
      expect(closeSpy).toHaveBeenCalledWith("idle");

      closeSpy.mockRestore();
      jest.useRealTimers();
    });

    it("skips cleanup when connection is removed or main", async () => {
      jest.useFakeTimers();
      const connection = { readyState: 1 } as unknown as Connection;
      const map = new Map<string, Connection>([["skip", connection]]);
      (map as unknown as { has: () => boolean }).has = () => false;
      internal.activeConnections = map;
      internal.mainConnection = { client: { s: { url: "skip" } } } as unknown as Connection;

      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();
      jest.advanceTimersByTime(30000);

      resetInternals();
      jest.useRealTimers();
    });

    it("does not close main connection during cleanup", async () => {
      jest.useFakeTimers();
      const connection = { readyState: 1 } as unknown as Connection;
      internal.activeConnections.set("main", connection);
      internal.connectionLastUsedMap.set(connection, Date.now() - 10 * 60 * 1000);
      internal.mainConnection = { client: { s: { url: "main" } } } as unknown as Connection;

      const closeSpy = jest
        .spyOn(MongooseDbManagement as unknown as { closeConnection: jest.Mock }, "closeConnection")
        .mockResolvedValue(undefined);

      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();
      jest.advanceTimersByTime(30000);

      expect(closeSpy).not.toHaveBeenCalled();
      closeSpy.mockRestore();
      resetInternals();
      jest.useRealTimers();
    });

    it("logs cleanup task errors", async () => {
      jest.useFakeTimers();
      internal.activeConnections.set("err", { readyState: 1 } as unknown as Connection);

      const closeSpy = jest
        .spyOn(MongooseDbManagement as unknown as { closeConnection: jest.Mock }, "closeConnection")
        .mockRejectedValue(new Error("cleanup fail"));

      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();
      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      expect(console.error).toHaveBeenCalled();
      closeSpy.mockRestore();
      resetInternals();
      jest.useRealTimers();
    });

    it("logs unhandled cleanup errors", async () => {
      jest.useFakeTimers();
      const brokenMap = new Map() as Map<string, Connection>;
      (brokenMap as unknown as { entries: () => IterableIterator<[string, Connection]> }).entries =
        () => {
          throw new Error("entries fail");
        };
      internal.activeConnections = brokenMap;

      (
        MongooseDbManagement as unknown as { initConnectionCleanup: () => void }
      ).initConnectionCleanup();
      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      expect(console.error).toHaveBeenCalled();
      resetInternals();
      jest.useRealTimers();
    });

    it("captures connection monitor events", async () => {
      const connection = new EventEmitter() as unknown as Connection & EventEmitter;
      (
        MongooseDbManagement as unknown as {
          setupConnectionMonitoring: (_conn: Connection, _name: string) => void;
        }
      ).setupConnectionMonitoring(connection, "Test");

      connection.emit("connected");
      connection.emit("disconnected");
      connection.emit("error", new Error("err"));
      connection.emit("reconnected");
      connection.emit("open");
    });

    it("returns false when license check throws", async () => {
      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockRejectedValue(new Error("db error"));

      const result = await MongooseDbManagement.checkLicense();
      expect(result).toBe(false);
      getConnectionSpy.mockRestore();
    });

    it("returns false when license record is missing credentials", async () => {
      const fakeConnection = {
        model: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            ExpireDate: new Date(Date.now() + 1000),
          }),
        }),
        close: jest.fn(),
      };
      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(fakeConnection);

      const result = await MongooseDbManagement.checkLicense();
      expect(result).toBe(false);
      expect(MongooseDbManagement.getDbWholeSalerConnectionString()).toBe("");

      getConnectionSpy.mockRestore();
    });

    it("shuts down cleanly when no connections exist", async () => {
      await MongooseDbManagement.shutdown();
      expect(internal.activeConnections.size).toBe(0);
      expect(internal.mainConnection).toBeNull();
    });

    it("throws when copying database without main connection", async () => {
      await expect(MongooseDbManagement.copyDatabase("mongodb://dest")).rejects.toThrow(
        /اتصال به دیتابیس اصلی/,
      );
    });

    it("logs and rethrows when copyDatabase fails", async () => {
      internal.mainConnection = {
        model: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ _id: "1" }]),
          }),
        }),
      } as unknown as Connection;
      const targetConnection = {
        model: jest.fn().mockReturnValue({
          insertMany: jest.fn().mockRejectedValue(new Error("insert fail")),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const getConnectionSpy = jest
        .spyOn(MongooseDbManagement as unknown as { getConnection: jest.Mock }, "getConnection")
        .mockResolvedValue(targetConnection);

      await expect(MongooseDbManagement.copyDatabase("mongodb://dest")).rejects.toThrow();
      getConnectionSpy.mockRestore();
    });
  });
});
