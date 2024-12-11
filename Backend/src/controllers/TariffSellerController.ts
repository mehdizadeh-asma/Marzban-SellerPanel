import { RequestHandler } from "express";
import { Types } from "mongoose";

import TariffSeller from "../models/TariffSeller";
import Tariff from "../models/Tariff";

class TariffSellerController {
  static GetTariffSellerListBySellerId: RequestHandler = async (
    req,
    res,
    next
  ) => {
    try {
      const sellerId: string = req.params.sellerId;
      const sellerTariffs = await TariffSeller.find({
        SellerId: new Types.ObjectId(sellerId),
      });
      const sellerTariffIds = new Set(
        sellerTariffs.map((ts) => ts.TariffId.toString())
      );

      const allTariffs = await Tariff.find();

      const tariffList = [
        ...allTariffs
          .filter((tariff) =>
            sellerTariffIds.has((tariff.id as Types.ObjectId).toString())
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
              !sellerTariffIds.has((tariff.id as Types.ObjectId).toString())
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
      const id: string = req.params.id;

      const tariffSeller = await TariffSeller.findOne({
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
      const { TariffID, SellerID } = req.body as {
        TariffID: string | undefined;
        SellerID: string | undefined;
      };
      const tariffSeller = new TariffSeller({
        TariffId: new Types.ObjectId(TariffID),
        Seller: new Types.ObjectId(SellerID),
      });

      const result = await tariffSeller.save();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  static AssignTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const sellerId: string = req.params.sellerid;
      const tariffIds = (req.body as { TariffIds: string[] }).TariffIds;

      await TariffSeller.deleteMany({
        SellerId: new Types.ObjectId(sellerId),
      });

      const newEntries = tariffIds.map((tariffId) => ({
        SellerId: new Types.ObjectId(sellerId),
        TariffId: new Types.ObjectId(tariffId),
      }));
      const result = await TariffSeller.insertMany(newEntries);

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
    next
  ) => {
    try {
      const id: string = req.params.sellerid;

      const result = await TariffSeller.deleteMany({
        SellerId: new Types.ObjectId(id),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
  static ChangeStatusTariffSeller: RequestHandler = async (req, res, next) => {
    try {
      const _id = new Types.ObjectId(req.params.id);

      const tariffSeller = await TariffSeller.findOne({ _id: _id });

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
