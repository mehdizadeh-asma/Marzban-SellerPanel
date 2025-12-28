import type { Connection, ConnectOptions } from "mongoose";
import mongoose from "mongoose";

import ConfigFile from "../config/Config";
import { copyDatabase as copyDatabaseWithDeps } from "./DbCopyService";
import { checkLicense as checkLicenseWithDeps } from "./LicenseService";

const DEFAULT_CONNECTION_OPTIONS: ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 30000,
  tls: true,
  tlsInsecure: false,
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

  private static getConnectionOptions(poolSize = 10): ConnectOptions {
    return {
      ...DEFAULT_CONNECTION_OPTIONS,
      maxPoolSize: poolSize,
      minPoolSize: Math.min(5, poolSize),
    };
  }

  private static initConnectionCleanup(): void {
    if (this.connectionCleanupInterval) return;

    const cleanupTask = async (): Promise<void> => {
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
            (this.mainConnection as ConnectionWithClient).client?.s?.url === connectionString;
          if (connection.readyState === mongoose.ConnectionStates.connected && isIdle && !isMain) {
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

  static async connectMainDatabase(): Promise<void> {
    if (this.mainConnection) {
      if (this.mainConnection.readyState !== mongoose.ConnectionStates.connected) {
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

  private static async createConnection(
    connectionString: string,
    connectionName: string,
    options: ConnectOptions,
  ): Promise<Connection> {
    try {
      const connection = mongoose.createConnection(connectionString, options);

      await new Promise<void>((resolve, reject) => {
        const connectHandler = (): void => {
          cleanup();
          resolve();
        };

        const errorHandler = (...args: unknown[]): void => {
          cleanup();
          const err = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
          reject(err);
        };

        const rawTimeout = (options as { connectTimeoutMS?: unknown }).connectTimeoutMS;
        const timeoutMs =
          typeof rawTimeout === "number" && Number.isFinite(rawTimeout) ? rawTimeout : 15000;

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("Connection timed out"));
        }, timeoutMs);

        const cleanup = (): void => {
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

  static async getConnection(
    connectionString: string,
    connectionName: string,
    poolSize = 10,
  ): Promise<Connection> {
    const cachedConnection = this.activeConnections.get(connectionString);
    if (cachedConnection && cachedConnection.readyState === mongoose.ConnectionStates.connected) {
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

  private static setupConnectionMonitoring(connection: Connection, name: string): void {
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

  private static buildConnectionString(
    cluster: string,
    database: string,
    username: string,
    password: string,
  ): string {
    return this.BASE_CONNECTION_STRING.replace("##CLUSTER##", cluster)
      .replace("##DB##", database)
      .replace("##USERNAME##", username)
      .replace("##PASSWORD##", password);
  }

  static async getDbPanelConnectionString(): Promise<string> {
    const [cluster, database, username, password] = await Promise.all([
      ConfigFile.GetPanelDbCluster(),
      ConfigFile.GetPanelDbDatabase(),
      ConfigFile.GetPanelDbUsername(),
      ConfigFile.GetPanelDbPassword(),
    ]);

    return this.buildConnectionString(cluster, database, username, password);
  }

  static setDbWholeSalerConnectionString(
    cluster: string,
    database: string,
    username: string,
    password: string,
  ): void {
    this.dbWholeSalerConnectionString = this.buildConnectionString(
      cluster,
      database,
      username,
      password,
    );
  }

  static getDbWholeSalerConnectionString(): string {
    return this.dbWholeSalerConnectionString;
  }

  static async checkLicense(): Promise<boolean> {
    return checkLicenseWithDeps({
      getConnection: (connectionString) => this.getConnection(connectionString, "LicenseDB", 5),
      closeConnection: (connectionString) => this.closeConnection(connectionString),
      getDbPanelConnectionString: () => this.getDbPanelConnectionString(),
      setDbWholeSalerConnectionString: (cluster, database, username, password) =>
        this.setDbWholeSalerConnectionString(cluster, database, username, password),
    });
  }

  static async copyDatabase(destinationConnectionString: string): Promise<void> {
    return copyDatabaseWithDeps(destinationConnectionString, {
      mainConnection: this.mainConnection,
      getConnection: (connectionString) => this.getConnection(connectionString, "CopyDB", 5),
      closeConnection: (connectionString) => this.closeConnection(connectionString),
    });
  }
}

export default MongooseDbManagement;
