import { RequestHandler } from "express";
import Tariff from "../models/Tariff";
import { Types } from "mongoose";
import Seller, { ISeller } from "../models/Seller";
import TariffSeller from "../models/TariffSeller";

class TariffController {
  static GetTariffList: RequestHandler = async (req, res, next) => {
    try {
      if (req.params.isall === "false") {
        if (!req.params.username) {
          res.status(404).json({ result: "Seller Not Found!" });
          return;
        }

        const seller = await Seller.findOne({ Username: req.params.username });

        if (!seller) {
          res.status(404).json({ result: "Seller Not Found!" });
          return;
        }

        const tariffSellers = await TariffSeller.find({
          SellerId: seller._id,
        });

        const tariffIds = tariffSellers.map((entry) => entry.TariffId);

        const condition = { _id: { $in: tariffIds }, IsVisible: true };
        const result = await Tariff.find(condition).sort({ Title: "asc" });

        res.status(200).json(result);
        return;
      }
      const result = await Tariff.find();
      res.status(200).json(result);
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
      const { Title, DataLimit, Duration, Price, IsFree, IsVisible } =
        req.body as {
          Title: string | undefined;
          DataLimit: number | undefined;
          Duration: number | undefined;
          Price: number | undefined;
          IsFree: boolean | undefined;
          IsVisible: boolean | undefined;
        };
      const tariff = new Tariff({
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
      const _id = new Types.ObjectId(req.params.id);

      const tariff = await Tariff.findOne({ _id: _id });

      if (tariff) {
        tariff.IsVisible = !tariff.IsVisible;
        await tariff.save();

        res.status(200).json({ result: "Tariff Changed!" });
      }
    } catch (error) {
      next(error);
    }
  };

  static FreeChanged: RequestHandler = async (req, res, next) => {
    try {
      const _id = new Types.ObjectId(req.params.id);

      const tariff = await Tariff.findOne({ _id: _id });

      if (tariff) {
        tariff.IsFree = !tariff.IsFree;
        await tariff.save();

        res.status(200).json({ result: "Tariff Changed!" });
      }
    } catch (error) {
      next(error);
    }
  };
}
export default TariffController;
