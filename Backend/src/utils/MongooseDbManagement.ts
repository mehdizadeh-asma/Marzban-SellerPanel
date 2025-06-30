import mongoose, {
  Connection,
  ConnectOptions,
  Model,
  Document,
} from "mongoose";

import { WholeSalerSchema } from "../models/WholeSaler";
import ConfigFile from "./Config";
import { AccountSchema, IAccount } from "../models/Account";
import { ISeller, SellerSchema } from "../models/Seller";
import { ITariff, TariffSchema } from "../models/Tariff";
import { ITariffInbound, TariffInboundSchema } from "../models/TariffInbound";
import { ITariffSeller, TariffSellerSchema } from "../models/TariffSeller";

// تنظیمات پیش‌فرض اتصال
const DEFAULT_CONNECTION_OPTIONS: ConnectOptions = {
  maxPoolSize: 20,
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
  // ذخیره زمان آخرین استفاده به صورت نوع‌ایمن
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
      const maxIdleTime = 5 * 60 * 1000; // 5 minutes
      const connections = Array.from(this.activeConnections.entries());

      for (const [connectionString, connection] of connections) {
        try {
          if (!this.activeConnections.has(connectionString)) continue;

          const lastUsed = this.connectionLastUsedMap.get(connection) || 0;
          const isIdle = now - lastUsed > maxIdleTime;

          // Define a type for connections with optional client property

          const isMain =
            this.mainConnection &&
            (this.mainConnection as ConnectionWithClient).client?.s?.url ===
              connectionString;
          if (connection.readyState === 1 && isIdle && !isMain) {
            console.log(`Closing idle connection: ${connectionString}`);
            await this.closeConnection(connectionString);
          }
        } catch (error) {
          console.error(
            `Error cleaning connection ${connectionString}:`,
            error
          );
        }
      }
    };

    // Wrap async task to handle promise properly
    this.connectionCleanupInterval = setInterval(() => {
      cleanupTask().catch((error) =>
        console.error("Unhandled error in connection cleanup:", error)
      );
    }, 30000);
  }

  // اتصال به دیتابیس اصلی
  static async connectMainDatabase(): Promise<void> {
    // اگر mainConnection وجود دارد اما قطع شده است، آن را ببند و دوباره کانکت کن
    if (this.mainConnection) {
      if (this.mainConnection.readyState !== 1) {
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
        this.getConnectionOptions(15)
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
    options: ConnectOptions
  ): Promise<Connection> {
    try {
      const connection = mongoose.createConnection(connectionString, options);

      // انتظار برای برقراری اتصال
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

      // تنظیم مانیتورینگ و ذخیره اتصال
      this.setupConnectionMonitoring(connection, connectionName);
      this.activeConnections.set(connectionString, connection);

      // استفاده از WeakMap برای ذخیره زمان آخرین استفاده به صورت نوع‌ایمن
      this.connectionLastUsedMap.set(connection, Date.now());

      // راه‌اندازی سیستم پاکسازی اگر فعال نیست
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
    poolSize = 10
  ): Promise<Connection> {
    const cachedConnection = this.activeConnections.get(connectionString);
    if (cachedConnection && cachedConnection.readyState === 1) {
      // به روز رسانی زمان استفاده در WeakMap
      this.connectionLastUsedMap.set(cachedConnection, Date.now());
      return cachedConnection;
    }

    return this.createConnection(
      connectionString,
      connectionName,
      this.getConnectionOptions(poolSize)
    );
  }

  // متد کمکی: اطمینان از اتصال سالم و تلاش مجدد در صورت قطع بودن
  static async ensureMainConnection(
    retries = 3,
    delayMs = 2000
  ): Promise<Connection> {
    let lastError: unknown = null;
    for (let i = 0; i < retries; i++) {
      const connectionString = this.getDbWholeSalerConnectionString();
      console.log(
        `[DB DEBUG] [ensureMainConnection] Try #${i + 1} - connectionString:`,
        connectionString
      );
      if (!connectionString) {
        console.error("[DB DEBUG] connectionString is empty/null!");
        throw new Error("WholeSaler connection string not configured");
      }
      if (!this.mainConnection || this.mainConnection.readyState !== 1) {
        try {
          console.log(
            `[DB DEBUG] [ensureMainConnection] mainConnection is null or not ready. Calling connectMainDatabase...`
          );
          await this.connectMainDatabase();
          if (this.mainConnection && this.mainConnection.readyState === 1) {
            console.log(
              `[DB DEBUG] [ensureMainConnection] mainConnection is now ready!`
            );
            return this.mainConnection;
          } else {
            console.warn(
              `[DB DEBUG] [ensureMainConnection] mainConnection still not ready after connectMainDatabase. State:`,
              this.mainConnection?.readyState
            );
          }
        } catch (e) {
          lastError = e;
          console.error(
            `[DB DEBUG] [ensureMainConnection] Error on try #${i + 1}:`,
            e
          );
          // پاک‌سازی mainConnection در صورت خطا
          this.mainConnection = null;
          await new Promise((res) => setTimeout(res, delayMs));
        }
      } else {
        console.log(
          `[DB DEBUG] [ensureMainConnection] mainConnection already ready!`
        );
        return this.mainConnection;
      }
    }
    console.error(
      `[DB DEBUG] [ensureMainConnection] All retries failed. Last error:`,
      lastError
    );
    throw (
      lastError || new Error("Failed to establish main database connection")
    );
  }

  // نسخه امن برای گرفتن اتصال اصلی (همیشه سالم)
  static async getMainConnectionSafe(): Promise<Connection> {
    return await this.ensureMainConnection();
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
      console.log(`Closed connection: ${connectionString}`);
    } catch (error) {
      console.error(`Error closing connection:`, error);
    }
  }

  // تنظیم مانیتورینگ اتصال
  private static setupConnectionMonitoring(
    connection: Connection,
    name: string
  ): void {
    connection.on("connected", () => {
      console.log(`[${name}] MongoDB connected`);
      // ذخیره زمان به روز رسانی در WeakMap
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
      // به روز رسانی زمان استفاده
      this.connectionLastUsedMap.set(connection, Date.now());
    });

    // به روز رسانی زمان هنگام انجام عملیات
    connection.on("open", () => {
      this.connectionLastUsedMap.set(connection, Date.now());
    });
  }

  // بستن همه اتصالات هنگام خاتمه
  static async shutdown(): Promise<void> {
    // توقف تایمر پاکسازی
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
      this.connectionCleanupInterval = null;
    }

    // بستن همه اتصالات فعال
    for (const [connectionString] of this.activeConnections) {
      await this.closeConnection(connectionString);
    }

    // بستن اتصال اصلی
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
      "marzbanseller01.xrbygjz"
    )
      .replace("##DB##", "MarzbanSellerPanel")
      .replace("##USERNAME##", "marzbansellerpanel")
      .replace("##PASSWORD##", "ZioVwUWNWcBb2LG6");
  }

  static setDbWholeSalerConnectionString(
    cluster: string,
    database: string,
    username: string,
    password: string
  ): void {
    this.dbWholeSalerConnectionString = this.BASE_CONNECTION_STRING.replace(
      "##CLUSTER##",
      cluster
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
        5
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
          wholeSaler.DbPassword
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
    destinationConnectionString: string
  ): Promise<void> {
    try {
      // اطمینان از وجود اتصال اصلی
      if (!this.mainConnection) {
        throw new Error("اتصال به دیتابیس اصلی برقرار نشده است");
      }

      const targetConnection = await this.getConnection(
        destinationConnectionString,
        "CopyDB",
        5
      );

      console.log("شروع فرآیند کپی دیتابیس...");

      // کپی تمام مجموعه‌های مورد نیاز
      await this.copyCollection<IAccount>(
        this.mainConnection.model<IAccount>("Account", AccountSchema),
        targetConnection.model<IAccount>("Account", AccountSchema),
        "Accounts"
      );

      await this.copyCollection<ISeller>(
        this.mainConnection.model<ISeller>("Seller", SellerSchema),
        targetConnection.model<ISeller>("Seller", SellerSchema),
        "Sellers"
      );

      await this.copyCollection<ITariff>(
        this.mainConnection.model<ITariff>("Tariff", TariffSchema),
        targetConnection.model<ITariff>("Tariff", TariffSchema),
        "Tariffs"
      );

      await this.copyCollection<ITariffInbound>(
        this.mainConnection.model<ITariffInbound>(
          "TariffInbound",
          TariffInboundSchema
        ),
        targetConnection.model<ITariffInbound>(
          "TariffInbound",
          TariffInboundSchema
        ),
        "TariffInbounds"
      );

      await this.copyCollection<ITariffSeller>(
        this.mainConnection.model<ITariffSeller>(
          "TariffSeller",
          TariffSellerSchema
        ),
        targetConnection.model<ITariffSeller>(
          "TariffSeller",
          TariffSellerSchema
        ),
        "TariffSellers"
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
    collectionName: string
  ): Promise<void> {
    console.log(`در حال کپی‌کردن ${collectionName}...`);

    // دریافت اسناد به صورت lean برای عملکرد بهتر
    const documents = await sourceModel.find().lean();

    if (documents.length === 0) {
      console.log(`هیچ سندی در ${collectionName} یافت نشد`);
      return;
    }

    try {
      // درج اسناد با امکان ادامه در صورت خطا
      await targetModel.insertMany(documents, { ordered: false });
      console.log(`تعداد ${documents.length} سند در ${collectionName} کپی شد`);
    } catch (insertError) {
      console.error(`خطا در کپی ${collectionName}:`, insertError);
      throw new Error(`کپی ${collectionName} ناموفق بود`);
    }
  }
}

export default MongooseDbManagement;
