import { Types } from "mongoose";

import { getModel } from "../db/MongooseModel";
import type { AuthenticatedRequest } from "../middleware/auth";
import type { ISeller } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import { HttpError } from "../utils/HttpError";
import { isValidObjectId } from "../utils/validation";
import { getVisibleTariffsForSellerId } from "./TariffSellerService";

type TariffListParams = {
  user?: AuthenticatedRequest["user"];
  isAll: boolean;
  title?: string;
};

export const getTariffList = async (params: TariffListParams): Promise<ITariff[]> => {
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);

  const isAdmin = params.user?.role === "admin";
  const isAll = isAdmin && params.isAll;

  if (!isAll) {
    let sellerTitle = params.title;

    if (!isAdmin) {
      if (!params.user?.sellerId) {
        throw new HttpError(403, "Seller context not found for current session");
      }
      if (!isValidObjectId(params.user.sellerId)) {
        throw new HttpError(400, "Invalid seller id");
      }
      const sessionSeller = await SellerModel.findById(params.user.sellerId);
      if (!sessionSeller) {
        throw new HttpError(404, "Seller Not Found!");
      }
      sellerTitle = sessionSeller.Title;
    }

    if (!sellerTitle) {
      throw new HttpError(404, "Seller Not Found!");
    }

    const seller = await SellerModel.findOne({ Title: sellerTitle });
    if (!seller) {
      throw new HttpError(404, "Seller Not Found!");
    }
    return getVisibleTariffsForSellerId(seller._id.toString());
  }

  return TariffModel.find();
};

export const getTariffById = async (id: string): Promise<ITariff> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const tariff = await TariffModel.findById(id);
  if (!tariff) {
    throw new HttpError(404, "Tariff Not Found!");
  }
  return tariff;
};

export const addTariff = async (payload: {
  title: string;
  dataLimit: number;
  duration: number;
  price: number;
  isFree?: boolean;
  isVisible?: boolean;
}): Promise<ITariff> => {
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const tariff = new TariffModel({
    Title: payload.title,
    DataLimit: payload.dataLimit,
    Duration: payload.duration,
    Price: payload.price,
    IsFree: payload.isFree ?? false,
    IsVisible: payload.isVisible ?? true,
  });
  return tariff.save();
};

export const editTariff = async (
  id: string,
  payload: {
    title?: string;
    dataLimit?: number;
    duration?: number;
    price?: number;
    isFree?: boolean;
    isVisible?: boolean;
  },
): Promise<ITariff> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const update: Partial<ITariff> = {};
  if (payload.title !== undefined) update.Title = payload.title;
  if (payload.dataLimit !== undefined) update.DataLimit = payload.dataLimit;
  if (payload.duration !== undefined) update.Duration = payload.duration;
  if (payload.price !== undefined) update.Price = payload.price;
  if (payload.isFree !== undefined) update.IsFree = payload.isFree;
  if (payload.isVisible !== undefined) update.IsVisible = payload.isVisible;
  if (Object.keys(update).length === 0) {
    throw new HttpError(400, "No tariff fields provided for update");
  }
  const updated = await TariffModel.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    throw new HttpError(404, "Tariff Not Found!");
  }
  return updated;
};

export const removeTariff = async (id: string): Promise<void> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const removed = await TariffModel.findByIdAndDelete(id);
  if (!removed) {
    throw new HttpError(404, "Tariff Not Found!");
  }
};

export const toggleTariffVisibility = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const tariff = await TariffModel.findOne({ _id: new Types.ObjectId(id) });
  if (!tariff) {
    throw new HttpError(404, "Tariff Not Found!");
  }
  tariff.IsVisible = !tariff.IsVisible;
  await tariff.save();
  return tariff.IsVisible;
};

export const toggleTariffFree = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const tariff = await TariffModel.findOne({ _id: new Types.ObjectId(id) });
  if (!tariff) {
    throw new HttpError(404, "Tariff Not Found!");
  }
  tariff.IsFree = !tariff.IsFree;
  await tariff.save();
  return tariff.IsFree;
};
