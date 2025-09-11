import type { Connection, ConnectOptions, Model, Document } from "mongoose";
import mongoose from "mongoose";

import ConfigFile from "./Config";
import type { IAccount } from "../models/Account";
import { AccountSchema } from "../models/Account";
import type { ISeller } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import type { ITariffInbound } from "../models/TariffInbound";
import { TariffInboundSchema } from "../models/TariffInbound";
import type { ITariffSeller } from "../models/TariffSeller";
import { TariffSellerSchema } from "../models/TariffSeller";
import { WholeSalerSchema } from "../models/WholeSaler";

// تنظیمات پیش‌فرض اتصال
const DEFAULT_CONNECTION_OPTIONS: ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 30000,
  tls: true,
  tlsInsecure: false, // برای تست می‌توانید true بگذارید، اما برای امنیت بهتر false باشد
  waitQueueTimeoutMS: 5000,
  maxIdleTimeMS: 30000,
};
interface ConnectionWithClient extends Connection {
  client?: { s?: { url?: string } };
}
class MongooseDbManagement {
  private static readonly BASE_CONNECTION_STRING =
    "mongodb+srv://##USERNAME##:##PASSWORD##@##CLUSTER##.mongodb.net/##DB##?retryWrites=true&w=majority";

  private static dbWholeSalerConnectionString = "";
  private static activeConnections: Map<string, Connection> = new Map();
  private static mainConnection: Connection | null = null;
  private static connectionCleanupInterval: NodeJS.Timeout | null = null;
  private static connectionLastUsedMap = new WeakMap<Connection, number>();

  // تنظیمات اتصال با اندازه پویای pool
  private static getConnectionOptions(poolSize = 10): ConnectOptions {
    return {
      ...DEFAULT_CONNECTION_OPTIONS,
      maxPoolSize: poolSize,
      minPoolSize: Math.min(5, poolSize),
    };
  }

  // سیستم پاکسازی خودکار اتصالات بلااستفاده
  private static initConnectionCleanup() {
    if (this.connectionCleanupInterval) return;

    const cleanupTask = async () => {
      const now = Date.now();
      const maxIdleTime = 5 * 60 * 1000;
      const connections = Array.from(this.activeConnections.entries());

      for (const [connectionString, connection] of connections) {
        try {
          if (!this.activeConnections.has(connectionString)) continue;

          const lastUsed = this.connectionLastUsedMap.get(connection) || 0;
          const isIdle = now - lastUsed > maxIdleTime;

          const isMain =
            this.mainConnection &&
            (this.mainConnection as ConnectionWithClient).client?.s?.url ===
              connectionString;
          if (
            connection.readyState === mongoose.ConnectionStates.connected &&
            isIdle &&
            !isMain
          ) {
            console.log(`Closing idle Main connection`);
            await this.closeConnection(connectionString);
          }
        } catch (error) {
          console.error(`Error cleaning connection :`, error);
        }
      }
    };

    this.connectionCleanupInterval = setInterval(() => {
      cleanupTask().catch((error) =>
        console.error("Unhandled error in connection cleanup:", error),
      );
    }, 30000);
  }

  // اتصال به دیتابیس اصلی
  static async connectMainDatabase(): Promise<void> {
    if (this.mainConnection) {
      if (
        this.mainConnection.readyState !== mongoose.ConnectionStates.connected
      ) {
        try {
          await this.mainConnection.close();
        } catch (e) {
          console.warn("Error closing stale mainConnection:", e);
        }
        this.mainConnection = null;
      } else {
        return;
      }
    }

    const connectionString = this.getDbWholeSalerConnectionString();
    if (!connectionString) {
      throw new Error("WholeSaler connection string not configured");
    }

    try {
      this.mainConnection = await this.createConnection(
        connectionString,
        "MainDB",
        this.getConnectionOptions(15),
      );
      console.log("Main database connection established");
    } catch (error) {
      console.error("Failed to connect to main database:", error);
      throw error;
    }
  }

  // ایجاد اتصال جدید
  private static async createConnection(
    connectionString: string,
    connectionName: string,
    options: ConnectOptions,
  ): Promise<Connection> {
    try {
      const connection = mongoose.createConnection(connectionString, options);

      await new Promise<void>((resolve, reject) => {
        const connectHandler = () => {
          cleanup();
          resolve();
        };

        const errorHandler = (err: Error) => {
          cleanup();
          reject(err);
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Connection timed out"));
        }, options.connectTimeoutMS || 15000);

        const cleanup = () => {
          connection.removeListener("connected", connectHandler);
          connection.removeListener("error", errorHandler);
          clearTimeout(timeout);
        };

        connection.once("connected", connectHandler);
        connection.once("error", errorHandler);
      });

      this.setupConnectionMonitoring(connection, connectionName);
      this.activeConnections.set(connectionString, connection);

      this.connectionLastUsedMap.set(connection, Date.now());

      if (!this.connectionCleanupInterval) {
        this.initConnectionCleanup();
      }

      return connection;
    } catch (error) {
      console.error(`[${connectionName}] Connection failed:`, error);
      throw error;
    }
  }

  // دریافت اتصال (استفاده از کش یا ایجاد جدید)
  static async getConnection(
    connectionString: string,
    connectionName: string,
    poolSize = 10,
  ): Promise<Connection> {
    const cachedConnection = this.activeConnections.get(connectionString);
    if (
      cachedConnection &&
      cachedConnection.readyState === mongoose.ConnectionStates.connected
    ) {
      this.connectionLastUsedMap.set(cachedConnection, Date.now());
      return cachedConnection;
    }

    return this.createConnection(
      connectionString,
      connectionName,
      this.getConnectionOptions(poolSize),
    );
  }

  static getMainConnection(): Connection | null {
    return this.mainConnection;
  }

  // بستن اتصال
  static async closeConnection(connectionString: string): Promise<void> {
    const mainConn = this.mainConnection as ConnectionWithClient;

    if (
      mainConn &&
      mainConn.client &&
      typeof mainConn.client.s?.url === "string" &&
      mainConn.client.s.url === connectionString
    ) {
      console.log("Skip closing mainConnection");
      return;
    }

    const connection = this.activeConnections.get(connectionString);
    if (!connection) return;

    try {
      await connection.close();
      this.activeConnections.delete(connectionString);
      console.log(`Closed connection`);
    } catch (error) {
      console.error(`Error closing connection:`, error);
    }
  }

  // تنظیم مانیتورینگ اتصال
  private static setupConnectionMonitoring(
    connection: Connection,
    name: string,
  ): void {
    connection.on("connected", () => {
      console.log(`[${name}] MongoDB connected`);
      this.connectionLastUsedMap.set(connection, Date.now());
    });

    connection.on("disconnected", () => {
      console.warn(`[${name}] MongoDB disconnected`);
    });

    connection.on("error", (err) => {
      console.error(`[${name}] MongoDB error:`, err);
    });

    connection.on("reconnected", () => {
      console.log(`[${name}] MongoDB reconnected`);
      this.connectionLastUsedMap.set(connection, Date.now());
    });

    connection.on("open", () => {
      this.connectionLastUsedMap.set(connection, Date.now());
    });
  }

  // بستن همه اتصالات هنگام خاتمه
  static async shutdown(): Promise<void> {
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
      this.connectionCleanupInterval = null;
    }

    for (const [connectionString] of this.activeConnections) {
      await this.closeConnection(connectionString);
    }

    if (this.mainConnection) {
      await this.mainConnection.close();
      this.mainConnection = null;
    }

    console.log("All database connections closed");
  }

  // متدهای مدیریت رشته اتصال
  static getDbPanelConnectionString(): string {
    return this.BASE_CONNECTION_STRING.replace(
      "##CLUSTER##",
      "marzbansellerpanel.ghtzkr3",
    )
      .replace("##DB##", "MarzbanSellerPanel")
      .replace("##USERNAME##", "marzbansellerpanel")
      .replace("##PASSWORD##", "bwvOIYFifBShAtIj");
  }

  static setDbWholeSalerConnectionString(
    cluster: string,
    database: string,
    username: string,
    password: string,
  ): void {
    this.dbWholeSalerConnectionString = this.BASE_CONNECTION_STRING.replace(
      "##CLUSTER##",
      cluster,
    )
      .replace("##DB##", database)
      .replace("##USERNAME##", username)
      .replace("##PASSWORD##", password);
  }

  static getDbWholeSalerConnectionString(): string {
    return this.dbWholeSalerConnectionString;
  }

  // مدیریت لایسنس
  static async checkLicense(): Promise<boolean> {
    const marzbanUrl = await ConfigFile.GetMarzbanURL();
    const sn = await ConfigFile.GetSerialKey();
    const connectionString = this.getDbPanelConnectionString();

    try {
      const connection = await this.getConnection(
        connectionString,
        "LicenseDB",
        5,
      );

      const WholeSalerModel = connection.model("WholeSaler", WholeSalerSchema);
      const wholeSaler = await WholeSalerModel.findOne({
        MarzbanUrl: marzbanUrl,
        SN: sn,
      });

      await this.closeConnection(connectionString);

      if (wholeSaler && wholeSaler.ExpireDate >= new Date()) {
        this.setDbWholeSalerConnectionString(
          wholeSaler.Cluster,
          wholeSaler.Database,
          wholeSaler.DbUsername,
          wholeSaler.DbPassword,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("License check failed:", error);
      return false;
    }
  }

  // کپی دیتابیس
  static async copyDatabase(
    destinationConnectionString: string,
  ): Promise<void> {
    try {
      if (!this.mainConnection) {
        throw new Error("اتصال به دیتابیس اصلی برقرار نشده است");
      }

      const targetConnection = await this.getConnection(
        destinationConnectionString,
        "CopyDB",
        5,
      );

      console.log("شروع فرآیند کپی دیتابیس...");

      await this.copyCollection<IAccount>(
        this.mainConnection.model<IAccount>("Account", AccountSchema),
        targetConnection.model<IAccount>("Account", AccountSchema),
        "Accounts",
      );

      await this.copyCollection<ISeller>(
        this.mainConnection.model<ISeller>("Seller", SellerSchema),
        targetConnection.model<ISeller>("Seller", SellerSchema),
        "Sellers",
      );

      await this.copyCollection<ITariff>(
        this.mainConnection.model<ITariff>("Tariff", TariffSchema),
        targetConnection.model<ITariff>("Tariff", TariffSchema),
        "Tariffs",
      );

      await this.copyCollection<ITariffInbound>(
        this.mainConnection.model<ITariffInbound>(
          "TariffInbound",
          TariffInboundSchema,
        ),
        targetConnection.model<ITariffInbound>(
          "TariffInbound",
          TariffInboundSchema,
        ),
        "TariffInbounds",
      );

      await this.copyCollection<ITariffSeller>(
        this.mainConnection.model<ITariffSeller>(
          "TariffSeller",
          TariffSellerSchema,
        ),
        targetConnection.model<ITariffSeller>(
          "TariffSeller",
          TariffSellerSchema,
        ),
        "TariffSellers",
      );

      console.log("کپی دیتابیس با موفقیت انجام شد");
      await this.closeConnection(destinationConnectionString);
    } catch (error) {
      console.error("خطا در کپی دیتابیس:", error);
      throw error;
    }
  }

  // متد کمکی برای کپی مجموعه‌ها
  private static async copyCollection<T extends Document>(
    sourceModel: Model<T>,
    targetModel: Model<T>,
    collectionName: string,
  ): Promise<void> {
    console.log(`در حال کپی‌کردن ${collectionName}...`);

    const documents = await sourceModel.find().lean();

    if (documents.length === 0) {
      console.log(`هیچ سندی در ${collectionName} یافت نشد`);
      return;
    }

    try {
      await targetModel.insertMany(documents, { ordered: false });
      console.log(`تعداد ${documents.length} سند در ${collectionName} کپی شد`);
    } catch (insertError) {
      console.error(`خطا در کپی ${collectionName}:`, insertError);
      throw new Error(`کپی ${collectionName} ناموفق بود`);
    }
  }
}

export default MongooseDbManagement;
