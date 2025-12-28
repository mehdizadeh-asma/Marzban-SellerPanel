import { Types } from "mongoose";

import { getModel } from "../db/MongooseModel";
import { withMainTransaction } from "../db/withTransaction";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import type { ITariffSeller } from "../models/TariffSeller";
import { TariffSellerSchema } from "../models/TariffSeller";
import { HttpError } from "../utils/HttpError";
import { isValidObjectId } from "../utils/validation";

export const getTariffSellerListBySellerId = async (
  sellerId: string,
  visibleOnly: boolean,
): Promise<
  {
    TariffId: Types.ObjectId;
    Title: string;
    SellerId: string;
    Price?: number;
  }[]
> => {
  if (!isValidObjectId(sellerId)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const sellerTariffs = await TariffSellerModel.find({
    SellerId: new Types.ObjectId(sellerId),
  });
  const sellerTariffIds = new Set(
    sellerTariffs
      .map((ts) => {
        const tariffId = ts.TariffId;
        if (tariffId instanceof Types.ObjectId) return tariffId.toString();
        if (typeof tariffId === "string") return tariffId;
        return tariffId?._id?.toString();
      })
      .filter((tariffId): tariffId is string => Boolean(tariffId)),
  );
  const allTariffs = await TariffModel.find(visibleOnly ? { IsVisible: true } : {});
  return [
    ...allTariffs
      .filter((tariff) => sellerTariffIds.has(tariff._id.toString()))
      .map((tariff) => ({
        TariffId: tariff._id,
        Title: tariff.Title,
        SellerId: sellerId,
        Price: tariff.Price,
      })),
    ...allTariffs
      .filter((tariff) => !sellerTariffIds.has(tariff._id.toString()))
      .map((tariff) => ({
        TariffId: tariff._id,
        Title: tariff.Title,
        SellerId: "",
        Price: tariff.Price,
      })),
  ];
};

export const getVisibleTariffsForSellerId = async (sellerId: string): Promise<ITariff[]> => {
  if (!isValidObjectId(sellerId)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);
  const sellerTariffs = await TariffSellerModel.find({
    SellerId: new Types.ObjectId(sellerId),
  });
  const sellerTariffIds = sellerTariffs
    .map((ts) => {
      const tariffId = ts.TariffId;
      if (tariffId instanceof Types.ObjectId) return tariffId;
      if (typeof tariffId === "string") {
        return isValidObjectId(tariffId) ? new Types.ObjectId(tariffId) : undefined;
      }
      const nestedId = tariffId?._id;
      if (nestedId instanceof Types.ObjectId) return nestedId;
      if (typeof nestedId === "string") {
        return isValidObjectId(nestedId) ? new Types.ObjectId(nestedId) : undefined;
      }
      return undefined;
    })
    .filter((tariffId): tariffId is Types.ObjectId => Boolean(tariffId));
  return TariffModel.find({ _id: { $in: sellerTariffIds }, IsVisible: true });
};

export const getTariffSeller = async (id: string): Promise<ITariffSeller> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const tariffSeller = await TariffSellerModel.findOne({
    _id: new Types.ObjectId(id),
  });
  if (!tariffSeller) {
    throw new HttpError(404, "Tariff Seller Not Found!");
  }
  return tariffSeller;
};

export const addTariffSeller = async (
  tariffId: string,
  sellerId: string,
): Promise<ITariffSeller> => {
  if (!isValidObjectId(tariffId)) {
    throw new HttpError(400, "Invalid tariff id");
  }
  if (!isValidObjectId(sellerId)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const tariffSeller = new TariffSellerModel({
    TariffId: new Types.ObjectId(tariffId),
    SellerId: new Types.ObjectId(sellerId),
  });
  return tariffSeller.save();
};

export const assignTariffSeller = async (
  sellerId: string,
  tariffIds: string[],
): Promise<ITariffSeller[]> => {
  if (!isValidObjectId(sellerId)) {
    throw new HttpError(400, "Invalid seller id");
  }
  if (tariffIds.some((tariffId) => !isValidObjectId(tariffId))) {
    throw new HttpError(400, "Invalid tariff id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const uniqueTariffIds = Array.from(new Set(tariffIds));
  const newEntries = uniqueTariffIds.map((tariffId) => ({
    SellerId: new Types.ObjectId(sellerId),
    TariffId: new Types.ObjectId(tariffId),
  }));
  return withMainTransaction(async (session) => {
    await TariffSellerModel.deleteMany({ SellerId: new Types.ObjectId(sellerId) }, { session });
    if (newEntries.length === 0) {
      return [];
    }
    return TariffSellerModel.insertMany(newEntries, { session });
  });
};

export const removeTariffSellerBySellerId = async (sellerId: string): Promise<void> => {
  if (!isValidObjectId(sellerId)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  await TariffSellerModel.deleteMany({
    SellerId: new Types.ObjectId(sellerId),
  });
};

export const toggleTariffSellerStatus = async (id: string): Promise<string> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid tariff seller id");
  }
  const TariffSellerModel = await getModel<ITariffSeller>("TariffSeller", TariffSellerSchema);
  const tariffSeller = await TariffSellerModel.findOne({ _id: new Types.ObjectId(id) });
  if (!tariffSeller) {
    throw new HttpError(404, "Tariff Seller Not Found!");
  }
  tariffSeller.Status = tariffSeller.Status === "Active" ? "Deactive" : "Active";
  await tariffSeller.save();
  return tariffSeller.Status;
};
