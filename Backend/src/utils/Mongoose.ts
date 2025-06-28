import mongoose, {
  Connection,
  ConnectOptions,
  Model,
  Document,
} from "mongoose";
import Account, { AccountSchema } from "../models/Account";
import Seller, { SellerSchema } from "../models/Seller";
import Tariff, { TariffSchema } from "../models/Tariff";
import { WholeSalerSchema } from "../models/WholeSaler";
import ConfigFile from "./Config";

// تنظیمات پیش‌فرض اتصال
const DEFAULT_CONNECTION_OPTIONS: ConnectOptions = {
  maxPoolSize: 20,
  minPoolSize: 5,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 30000,
  ssl: true,
  tlsAllowInvalidCertificates: false,
  waitQueueTimeoutMS: 5000,
  maxIdleTimeMS: 30000,
};

class Mongoose {
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

    this.connectionCleanupInterval = setInterval(async () => {
      const now = Date.now();
      const maxIdleTime = 5 * 60 * 1000; // 5 دقیقه

      // ایجاد یک کپی از اتصالات برای جلوگیری از تغییرات حین اجرا
      const connections = Array.from(this.activeConnections.entries());

      // حلقه برای بررسی همه اتصالات فعال
      for (const [connectionString, connection] of connections) {
        try {
          // بررسی اگر اتصال هنوز در Map وجود دارد
          if (!this.activeConnections.has(connectionString)) continue;

          // دریافت زمان آخرین استفاده از WeakMap
          const lastUsed = this.connectionLastUsedMap.get(connection) || 0;
          const isIdle = now - lastUsed > maxIdleTime;

          if (connection.readyState === 1 && isIdle) {
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
    }, 30000); // هر 30 ثانیه چک کن
  }

  // اتصال به دیتابیس اصلی
  static async connectMainDatabase(): Promise<void> {
    if (this.mainConnection) return;

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

  // بستن اتصال
  static async closeConnection(connectionString: string): Promise<void> {
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
      const connection = await this.getConnection(
        destinationConnectionString,
        "CopyDB",
        5
      );

      console.log("Starting database copy process...");

      // کپی تعرفه‌ها
      await this.copyCollection(
        Tariff,
        connection.model("Tariff", TariffSchema),
        "Tariffs"
      );

      // کپی فروشندگان
      await this.copyCollection(
        Seller,
        connection.model("Seller", SellerSchema),
        "Sellers"
      );

      // کپی اکانت‌ها
      await this.copyCollection(
        Account,
        connection.model("Account", AccountSchema),
        "Accounts"
      );

      console.log("Database copy completed successfully");
      await this.closeConnection(destinationConnectionString);
    } catch (error) {
      console.error("Database copy failed:", error);
      throw error;
    }
  }

  // متد کمکی برای کپی مجموعه‌ها
  private static async copyCollection<T extends Document>(
    sourceModel: Model<T>,
    targetModel: Model<any>,
    collectionName: string
  ): Promise<void> {
    console.log(`Copying ${collectionName}...`);
    const documents = await sourceModel.find().lean();
    if (documents.length === 0) {
      console.log(`No documents found for ${collectionName}`);
      return;
    }

    await targetModel.insertMany(documents, { ordered: false });
    console.log(`Copied ${documents.length} ${collectionName}`);
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
}

export default Mongoose;
