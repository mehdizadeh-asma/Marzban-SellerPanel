import type { RequestHandler } from "express";
import { Types } from "mongoose";

import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import type { ITariffSeller } from "../models/TariffSeller";
import { TariffSellerSchema } from "../models/TariffSeller";
import AccountHelpers from "../utils/AccountHelpers";
import { getModel } from "../utils/MongooseModel";

class TariffSellerController {
  static GetTariffSellerListBySellerId: RequestHandler = async (
    req,
    res,
    next,
  ) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
      const sellerId: string = req.params.sellerId;
      const sellerTariffs = await TariffSellerModel.find({
        SellerId: new Types.ObjectId(sellerId),
      });
      const sellerTariffIds = new Set(
        sellerTariffs.map((ts) =>
          ts.TariffId instanceof Types.ObjectId
            ? ts.TariffId.toString()
            : ts.TariffId,
        ),
      );
      const allTariffs = await TariffModel.find();
      const tariffList = [
        ...allTariffs
          .filter((tariff) =>
            sellerTariffIds.has((tariff.id as Types.ObjectId).toString()),
          )
          .map((tariff) => ({
            TariffId: tariff._id,
            Title: tariff.Title,
            SellerId: sellerId,
            Price: tariff.Price,
          })),
        ...allTariffs
          .filter(
            (tariff) =>
              !sellerTariffIds.has((tariff.id as Types.ObjectId).toString()),
          )
          .map((tariff) => ({
            TariffId: tariff._id,
            Title: tariff.Title,
            SellerId: "",
            Price: tariff.Price,
          })),
      ];
      res.status(200).json(tariffList);
    } catch (error) {
      next(error);
    }
  };
  static GetTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const id: string = req.params.id;
      const tariffSeller = await TariffSellerModel.findOne({
        _id: new Types.ObjectId(id),
      });
      if (!tariffSeller) throw new Error("The Seller's Packages not found!");
      res.status(200).json(tariffSeller);
    } catch (error) {
      next(error);
    }
  };
  static AddTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const { TariffID, SellerID } = req.body as {
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      const tariffSeller = new TariffSellerModel({
        TariffId: new Types.ObjectId(TariffID),
        SellerId: new Types.ObjectId(SellerID),
      });
      const result = await tariffSeller.save();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  static AssignTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const sellerId: string = req.params.sellerid;
      const tariffIds = (req.body as { TariffIds: string[] }).TariffIds;
      await TariffSellerModel.deleteMany({
        SellerId: new Types.ObjectId(sellerId),
      });
      const newEntries = tariffIds.map((tariffId) => ({
        SellerId: new Types.ObjectId(sellerId),
        TariffId: new Types.ObjectId(tariffId),
      }));
      const result = await TariffSellerModel.insertMany(newEntries);
      res.status(200).json({
        message: "Tariffs successfully assigned to seller.",
        result,
      });
    } catch (error) {
      next(error);
    }
  };
  static RemoveTariffSellerBySellerId: RequestHandler = async (
    req,
    res,
    next,
  ) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const id: string = req.params.sellerid;
      const result = await TariffSellerModel.deleteMany({
        SellerId: new Types.ObjectId(id),
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  static ChangeStatusTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const TariffSellerModel = await getModel<ITariffSeller>(
        "TariffSeller",
        TariffSellerSchema,
      );
      const _id = new Types.ObjectId(req.params.id);
      const tariffSeller = await TariffSellerModel.findOne({ _id: _id });
      if (tariffSeller) {
        if (tariffSeller.Status == "Active") tariffSeller.Status = "Deactive";
        else tariffSeller.Status = "Active";
        await tariffSeller.save();
        res.status(200).json({
          result:
            "The Status Changed To" + tariffSeller.Status + " Successfully!",
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
export default TariffSellerController;
