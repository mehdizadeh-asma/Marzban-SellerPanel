import type { RequestHandler } from "express";
import { Types } from "mongoose";

import type { ISeller } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import type { ITariffSeller } from "../models/TariffSeller";
import { TariffSellerSchema } from "../models/TariffSeller";
import AccountHelpers from "../utils/AccountHelpers";
import { getModel } from "../utils/MongooseModel";

class TariffController {
  static GetTariffList: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      if (req.params.isall === "false") {
        if (!req.params.title) {
          res.status(404).json({ result: "Seller Not Found!" });
          return;
        }
        const seller = await SellerModel.findOne({ Title: req.params.title });
        if (!seller) {
          res.status(404).json({ result: "Seller Not Found!" });
          return;
        }
        const tariffSellers = await TariffSellerModel.find({
          SellerId: seller._id,
        });
        const tariffIds = tariffSellers.map((entry) => entry.TariffId);
        const condition = { _id: { $in: tariffIds }, IsVisible: true };
        const result = await TariffModel.find(condition); //.sort({ Title: "asc" });
        res.status(200).json(result);
        return;
      } else {
        const result = await TariffModel.find();
        res.status(200).json(result);
      }
    } catch (error) {
      next(error);
    }
  };

  static GetTariff: RequestHandler = (req, res, next) => {
    try {
      res.status(200).json({ result: "Not Implimented!" });
    } catch (error) {
      next(error);
    }
  };

  static AddTariff: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const { Title, DataLimit, Duration, Price, IsFree, IsVisible } =
        req.body as {
          Title: string | undefined;
          DataLimit: number | undefined;
          Duration: number | undefined;
          Price: number | undefined;
          IsFree: boolean | undefined;
          IsVisible: boolean | undefined;
        };
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const tariff = new TariffModel({
        Title: Title,
        DataLimit: DataLimit,
        Duration: Duration,
        Price: Price,
        IsFree: IsFree,
        IsVisible: IsVisible,
      });
      const result = await tariff.save();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static EditTariff: RequestHandler = (req, res, next) => {
    try {
      res.status(200).json({ result: "" });
    } catch (error) {
      next(error);
    }
  };

  static RemoveTariff: RequestHandler = (req, res, next) => {
    try {
      res.status(200).json({ result: "" });
    } catch (error) {
      next(error);
    }
  };

  static DisableTariff: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const _id = new Types.ObjectId(req.params.id);
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const tariff = await TariffModel.findOne({ _id: _id });
      if (tariff) {
        tariff.IsVisible = !tariff.IsVisible;
        await tariff.save();
        res.status(200).json({ result: "Tariff Changed!" });
      } else {
        res.status(404).json({ result: "Tariff Not Found!" });
      }
    } catch (error) {
      next(error);
    }
  };

  static FreeChanged: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const _id = new Types.ObjectId(req.params.id);
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const tariff = await TariffModel.findOne({ _id: _id });
      if (tariff) {
        tariff.IsFree = !tariff.IsFree;
        await tariff.save();
        res.status(200).json({ result: "Tariff Changed!" });
      } else {
        res.status(404).json({ result: "Tariff Not Found!" });
      }
    } catch (error) {
      next(error);
    }
  };
}
export default TariffController;
