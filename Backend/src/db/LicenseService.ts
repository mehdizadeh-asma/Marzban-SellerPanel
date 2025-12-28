import type { Connection } from "mongoose";

import ConfigFile from "../config/Config";
import { WholeSalerSchema } from "../models/WholeSaler";

type LicenseDependencies = {
  getConnection: (_connectionString: string) => Promise<Connection>;
  closeConnection: (_connectionString: string) => Promise<void>;
  getDbPanelConnectionString: () => Promise<string>;
  setDbWholeSalerConnectionString: (
    _cluster: string,
    _database: string,
    _username: string,
    _password: string,
  ) => void;
};

export const checkLicense = async (deps: LicenseDependencies): Promise<boolean> => {
  const marzbanUrl = await ConfigFile.GetMarzbanURL();
  const sn = await ConfigFile.GetSerialKey();
  const connectionString = await deps.getDbPanelConnectionString();

  let connection: Connection | null = null;
  try {
    connection = await deps.getConnection(connectionString);

    const WholeSalerModel = connection.model("WholeSaler", WholeSalerSchema);
    type WholeSalerRecord = {
      ExpireDate?: Date;
      Cluster?: string;
      Database?: string;
      DbUsername?: string;
      DbPassword?: string;
    };
    const wholeSaler = (await WholeSalerModel.findOne({
      MarzbanUrl: marzbanUrl,
      SN: sn,
    })) as WholeSalerRecord | null;

    if (wholeSaler?.ExpireDate && wholeSaler.ExpireDate >= new Date()) {
      const cluster = wholeSaler.Cluster?.trim();
      const database = wholeSaler.Database?.trim();
      const username = wholeSaler.DbUsername?.trim();
      const password = wholeSaler.DbPassword?.trim();

      if (!cluster || !database || !username || !password) {
        console.error("License record is missing database credentials");
        return false;
      }
      deps.setDbWholeSalerConnectionString(cluster, database, username, password);
      return true;
    }
    return false;
  } catch (error) {
    console.error("License check failed:", error);
    return false;
  } finally {
    if (connection) {
      try {
        await deps.closeConnection(connectionString);
      } catch (closeError) {
        console.error("Failed to close license connection:", closeError);
      }
    }
  }
};
