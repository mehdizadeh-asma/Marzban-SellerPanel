import axios from "axios";
import type { RequestHandler } from "express";
import { Types } from "mongoose";

import type { ISeller } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import AccountHelpers from "../utils/AccountHelpers";
import ConfigFile from "../utils/Config";
import { getModel } from "../utils/MongooseModel";

class SellerController {
  static GetSellerList: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const result = await SellerModel.find();

      const customSellers = await Promise.all(
        result.map(async (seller) => {
          const totalUnpaid = await AccountHelpers.GetTotalUnpaid(seller, false);

          return {
            ...seller.toObject(), // Convert mongoose doc to plain object
            TotalPrice: totalUnpaid.TotalPriceUnpaid,
          };
        }),
      );

      res.status(200).json(customSellers);
    } catch (error) {
      next(error);
    }
  };

  static GetSeller: RequestHandler = async (req, res, next) => {
    try {
      const id: string = req.params.id;
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const seller = await SellerModel.findOne({ _id: new Types.ObjectId(id) });
      if (!seller) throw new Error("Seller not found!");
      res.status(200).json(seller);
    } catch (error) {
      next(error);
    }
  };

  static AddSeller: RequestHandler = async (req, res, next) => {
    try {
      const { Title, Limit, Username, Password, MarzbanUsername, MarzbanPassword } = req.body as {
        Title: string | undefined;
        Limit: string;
        Username: string | undefined;
        Password: string | undefined;
        MarzbanUsername: string | undefined;
        MarzbanPassword: string | undefined;
      };
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      try {
        const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin/token";
        const config = {
          headers: { "content-type": "application/x-www-form-urlencoded" },
        };
        await axios.post(
          apiURL,
          {
            username: MarzbanUsername,
            password: MarzbanPassword,
          },
          config,
        );
      } catch (error) {
        res.status(404).json({ Message: "Invalid Marzban Account Information" });
        next(error);
        return;
      }
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const seller = new SellerModel({
        Title: Title,
        Limit: +Limit,
        Username: Username,
        Password: Password,
        MarzbanUsername: MarzbanUsername,
        MarzbanPassword: MarzbanPassword,
      });
      const result = await seller.save();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static EditSeller: RequestHandler = async (req, res, next) => {
    try {
      const id = req.params.id;
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");
      const { Title, Limit, Username, Password, MarzbanUsername, MarzbanPassword } = req.body as {
        Title: string;
        Limit: number;
        Username: string;
        Password: string;
        MarzbanUsername: string;
        MarzbanPassword: string;
      };
      try {
        const apiURL = (await ConfigFile.GetMarzbanURL()) + "/api/admin/token";
        const config = {
          headers: { "content-type": "application/x-www-form-urlencoded" },
        };
        await axios.post(
          apiURL,
          {
            username: MarzbanUsername,
            password: MarzbanPassword,
          },
          config,
        );
      } catch (error) {
        res.status(404).json({ Message: "Invalid Marzban Account Information" });
        next(error);
        return;
      }
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const existingSeller = await SellerModel.findOne({
        $or: [
          { Title: new RegExp(`^${Title}$`, "i") },
          { Username: new RegExp(`^${Username}$`, "i") },
        ],
        _id: { $ne: id },
      });
      if (existingSeller) {
        return res.status(400).json({ error: "Title Or Username Already Exists!" });
      }
      const tempSeller = new SellerModel({
        _id: id,
        Title,
        Limit,
        Username,
        Password,
        MarzbanUsername,
        MarzbanPassword,
      });
      tempSeller.validateSync();
      const updateFields: Partial<typeof req.body> = {};
      if (Title) updateFields.Title = Title;
      if (Limit !== undefined) updateFields.Limit = Limit;
      if (Username) updateFields.Username = Username;
      if (Password) updateFields.Password = Password;
      if (MarzbanUsername) updateFields.MarzbanUsername = MarzbanUsername;
      if (MarzbanPassword) updateFields.MarzbanPassword = MarzbanPassword;
      const updatedSeller = await SellerModel.findByIdAndUpdate(id, updateFields, {
        new: true,
        runValidators: true,
      });
      if (!updatedSeller) {
        return res.status(404).json({ error: "Seller Not Found" });
      }
      res.status(200).json({
        message: "Seller updated successfully",
        seller: updatedSeller,
      });
    } catch (error) {
      next(error);
    }
  };

  static RemoveSeller: RequestHandler = async (req, res, next) => {
    try {
      const id: string = req.params.id;
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const result = await SellerModel.deleteOne({
        _id: new Types.ObjectId(id),
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  static DisableSeller: RequestHandler = async (req, res, next) => {
    try {
      if (!(await AccountHelpers.CheckToken(req.headers.authorization)))
        throw new Error("Invalid Token");

      const _id = new Types.ObjectId(req.params.id);
      const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
      const seller = await SellerModel.findOne({ _id: _id });
      if (seller) {
        if (seller.Status == "Active") seller.Status = "Deactive";
        else seller.Status = "Active";
        await seller.save();
        res.status(200).json({ result: "Seller Changed!" });
      }
    } catch (error) {
      next(error);
    }
  };
}
export default SellerController;
