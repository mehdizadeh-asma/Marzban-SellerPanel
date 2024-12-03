import mongoose from "mongoose";
import Account, { AccountSchema } from "../models/Account";
import Seller, { SellerSchema } from "../models/Seller";
import Tariff, { TariffSchema } from "../models/Tariff";
import { WholeSalerSchema } from "../models/WholeSaler";
import ConfigFile from "./Config";

class Mongoose {
  static ConnectionString =
    "mongodb+srv://##USERNAME##:##PASSWORD##@##CLUSTER##.mongodb.net/##DB##?retryWrites=true&w=majority&connectTimeoutMS=20000&socketTimeoutMS=20000";

  static DbWholeSalerConnectionString: string = "";

  static GetDbPanelConnectionString() {
    return this.ConnectionString.replace(
      "##CLUSTER##",
      "marzbanseller01.xrbygjz"
    )
      .replace("##DB##", "MarzbanSellerPanel")
      .replace("##USERNAME##", "marzbansellerpanel")
      .replace("##PASSWORD##", "ZioVwUWNWcBb2LG6");
  }

  static SetDbWholeSalerConnectionString(
    Cluster: string,
    Database: string,
    DbUsername: string,
    DbPassword: string
  ) {
    this.DbWholeSalerConnectionString = this.ConnectionString.replace(
      "##CLUSTER##",
      Cluster
    )
      .replace("##DB##", Database)
      .replace("##USERNAME##", DbUsername)
      .replace("##PASSWORD##", DbPassword);
  }

  static GetDbWholeSalerConnectionString() {
    return this.DbWholeSalerConnectionString;
  }

  static async ConnectDbWholeSaler() {
    if (this.GetDbWholeSalerConnectionString() == "")
      throw new Error("DbWholeSaler connection String Not Found");

    mongoose.set("strictQuery", true);
    await mongoose.connect(this.GetDbWholeSalerConnectionString(), {
      maxPoolSize: 20,
      maxConnecting: 25,
    });
    return true;
  }

  static async CheckLicense() {
    const marzbanUrl = await ConfigFile.GetMarzbanURL();
    const sn = await ConfigFile.GetSerialKey();

    const connection = this.ConnectToDatabase(
      this.GetDbPanelConnectionString()
    );

    if (connection) {
      const WholeSaler = connection.model("WholeSaler", WholeSalerSchema);

      const wholeSaler = await WholeSaler.findOne({
        MarzbanUrl: marzbanUrl,
        SN: sn,
      });

      if (wholeSaler && wholeSaler.ExpireDate >= new Date()) {
        this.SetDbWholeSalerConnectionString(
          wholeSaler.Cluster,
          wholeSaler.Database,
          wholeSaler.DbUsername,
          wholeSaler.DbPassword
        );
        return true;
      }
      return false;
    }
  }

  static async AddWholeSaler() {
    const connection = this.ConnectToDatabase(
      this.GetDbPanelConnectionString()
    );

    if (connection) {
      const WholeSaler = connection.model("WholeSaler", WholeSalerSchema);

      const wholeSaler = new WholeSaler();
      wholeSaler.Owner = "@whoer";
      wholeSaler.MarzbanUrl = "https://pro.check-smoke.one/";
      wholeSaler.SN = "g0maf6jo?$to";
      wholeSaler.ExpireDate = new Date("2024-02-10");
      wholeSaler.Cluster = "marzbanseller01.xrbygjz";
      wholeSaler.Database = "Smoking";
      wholeSaler.DbUsername = "marzbansellerpanel";
      wholeSaler.DbPassword = "ZioVwUWNWcBb2LG6";

      await wholeSaler.save();

      this.SetDbWholeSalerConnectionString(
        wholeSaler.Cluster,
        wholeSaler.Database,
        wholeSaler.DbUsername,
        wholeSaler.DbPassword
      );

      if (await this.ConnectDbWholeSaler()) {
        const tariff = new Tariff();
        tariff.Title = "50GB 1Month";
        tariff.DataLimit = 50;
        tariff.Duration = 30;
        tariff.IsFree = false;
        tariff.IsVisible = true;

        await tariff.save();
      }
    }
  }

  static ConnectToDatabase(connectionString: string) {
    if (!connectionString && connectionString == "")
      throw new Error("MongoDb connection String Not Found");

    return mongoose.createConnection(connectionString, {
      maxPoolSize: 20,
      maxConnecting: 25,
    });
  }

  static async CopyDatabase(destinatioConnectionString: string) {
    const connection = this.ConnectToDatabase(destinatioConnectionString);

    if (connection) {
      console.log("Start Copy Tariffs...");
      const tariffs = await Tariff.find();
      const TariffNew = connection.model("Tariff", TariffSchema);
      if (tariffs && TariffNew)
        for (const tariff of tariffs) {
          const tariffnew = new TariffNew();
          tariffnew._id = tariff._id;
          tariffnew.Title = tariff.Title;
          tariffnew.DataLimit = tariff.DataLimit;
          tariffnew.Duration = tariff.Duration;
          tariffnew.Price = tariff.Price;
          tariffnew.IsFree = tariff.IsFree;
          tariffnew.IsVisible = tariff.IsVisible;
          await tariffnew.save();
        }

      console.log("Start Copy Sellers...");
      const sellers = await Seller.find();
      const SellerNew = connection.model("Seller", SellerSchema);
      if (sellers && SellerNew)
        for (const seller of sellers) {
          const sellernew = new SellerNew();
          sellernew._id = seller._id;
          sellernew.Title = seller.Title;
          sellernew.Username = seller.Username;
          sellernew.Password = seller.Password;
          sellernew.MarzbanUsername = seller.MarzbanUsername;
          sellernew.MarzbanPassword = seller.MarzbanPassword;
          sellernew.Counter = seller.Counter;
          sellernew.Limit = seller.Limit;
          sellernew.Status = seller.Status;
          await sellernew.save();
        }

      console.log("Start Copy Accounts...");
      const accounts = await Account.find();
      const AccountNew = connection.model("Account", AccountSchema);
      if (accounts && AccountNew)
        for (const account of accounts) {
          const accountnew = new AccountNew();
          accountnew._id = account._id;
          accountnew.Username = account.Username;
          accountnew.Seller = account.Seller;
          accountnew.Tariff = account.Tariff;
          accountnew.TariffId = account.TariffId;
          accountnew.Payed = account.Payed;
          await accountnew.save();
        }
    }
  }
}

export default Mongoose;
