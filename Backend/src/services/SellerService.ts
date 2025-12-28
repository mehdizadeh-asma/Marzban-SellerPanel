import { Types } from "mongoose";

import { getModel } from "../db/MongooseModel";
import type { IAccount } from "../models/Account";
import { AccountSchema } from "../models/Account";
import type { ISeller, SellerDocument } from "../models/Seller";
import { SellerSchema } from "../models/Seller";
import type { ITariff } from "../models/Tariff";
import { TariffSchema } from "../models/Tariff";
import { HttpError } from "../utils/HttpError";
import { isValidObjectId } from "../utils/validation";
import AccountHelpers from "./account/AccountHelpers";
import { validateMarzbanCredentials as validateMarzban } from "./marzban/MarzbanClient";
import { CryptoService } from "./security/CryptoService";
import { PasswordService } from "./security/PasswordService";

type SellerListOptions = {
  page?: number;
  limit?: number;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const sanitizeSeller = (seller: SellerDocument | null): Record<string, unknown> | null => {
  if (!seller) return null;
  const plain = seller.toObject
    ? (seller.toObject() as unknown as Record<string, unknown>)
    : (seller as unknown as Record<string, unknown>);
  delete plain.Password;
  delete plain.MarzbanPassword;
  return plain;
};

const validateMarzbanCredentials = async (
  marzbanUsername: string,
  marzbanPassword: string,
): Promise<void> => {
  try {
    await validateMarzban(marzbanUsername, marzbanPassword);
  } catch {
    throw new HttpError(400, "Invalid Marzban Account Information");
  }
};

export const getSellerList = async (
  options: SellerListOptions,
): Promise<Record<string, unknown>[]> => {
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const AccountModel = await getModel<IAccount>("Account", AccountSchema);
  const TariffModel = await getModel<ITariff>("Tariff", TariffSchema);

  let query = SellerModel.find();
  if (typeof options.limit === "number" && options.limit > 0) {
    const safePage = typeof options.page === "number" && options.page > 0 ? options.page : 1;
    query = query.skip((safePage - 1) * options.limit).limit(options.limit);
  }

  const sellers = await query;
  if (sellers.length === 0) return [];

  const sellerIds = sellers.map((seller) => seller._id);
  const unpaidAccounts = await AccountModel.find({
    Payed: false,
    Seller: { $in: sellerIds },
  });

  const tariffIds = unpaidAccounts
    .map((account) => {
      const tariffId = account.TariffId;
      if (tariffId instanceof Types.ObjectId) return tariffId;
      if (typeof tariffId === "string") return new Types.ObjectId(tariffId);
      return tariffId?._id;
    })
    .filter((tariffId): tariffId is Types.ObjectId => Boolean(tariffId));

  const tariffs = tariffIds.length
    ? await TariffModel.find({ _id: { $in: tariffIds }, IsFree: false }).lean()
    : [];
  const tariffMap = new Map(tariffs.map((tariff) => [tariff._id.toString(), tariff]));
  const totalsBySeller = new Map<string, { totalPrice: number }>();

  unpaidAccounts.forEach((account) => {
    const sellerId = AccountHelpers.GetAccountSellerId(account);
    if (!sellerId) return;
    const tariffId =
      account.TariffId instanceof Types.ObjectId
        ? account.TariffId.toString()
        : typeof account.TariffId === "string"
          ? account.TariffId
          : account.TariffId?._id?.toString();
    if (!tariffId) return;
    const tariff = tariffMap.get(tariffId);
    if (!tariff) return;
    const current = totalsBySeller.get(sellerId) ?? { totalPrice: 0 };
    current.totalPrice += tariff.Price ?? 0;
    totalsBySeller.set(sellerId, current);
  });

  const customSellers = sellers.map((seller) => {
    const sellerId = seller._id.toString();
    const totals = totalsBySeller.get(sellerId);
    return {
      ...seller.toObject(),
      TotalPrice: totals?.totalPrice ?? 0,
    };
  });

  return customSellers.map((sellerObj) => {
    const clone = { ...sellerObj } as Record<string, unknown>;
    delete clone.Password;
    delete clone.MarzbanPassword;
    return clone;
  });
};

export const getSellerById = async (id: string): Promise<Record<string, unknown> | null> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const seller = await SellerModel.findOne({ _id: new Types.ObjectId(id) });
  if (!seller) {
    throw new HttpError(404, "Seller not found");
  }
  return sanitizeSeller(seller);
};

export const addSeller = async (params: {
  title: string;
  limit: number;
  username: string;
  password: string;
  marzbanUsername: string;
  marzbanPassword: string;
}): Promise<Record<string, unknown> | null> => {
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const duplicateSeller = await SellerModel.findOne({
    $or: [
      { Title: new RegExp(`^${escapeRegex(params.title)}$`, "i") },
      { Username: new RegExp(`^${escapeRegex(params.username)}$`, "i") },
    ],
  });
  if (duplicateSeller) {
    throw new HttpError(400, "Title Or Username Already Exists!");
  }

  await validateMarzbanCredentials(params.marzbanUsername, params.marzbanPassword);

  const passwordHash = await PasswordService.hashPassword(params.password);
  const encryptedMarzbanPassword = await CryptoService.encrypt(params.marzbanPassword);

  const seller = new SellerModel({
    Title: params.title,
    Limit: params.limit,
    Username: params.username,
    Password: passwordHash,
    MarzbanUsername: params.marzbanUsername,
    MarzbanPassword: encryptedMarzbanPassword,
  });
  const result = await seller.save();
  return sanitizeSeller(result);
};

export const editSeller = async (
  id: string,
  params: {
    title?: string;
    limit?: number;
    username?: string;
    password?: string;
    marzbanUsername: string;
    marzbanPassword: string;
  },
): Promise<Record<string, unknown> | null> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid seller id");
  }
  await validateMarzbanCredentials(params.marzbanUsername, params.marzbanPassword);

  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const duplicateConditions: Record<string, RegExp>[] = [];
  if (params.title) {
    duplicateConditions.push({ Title: new RegExp(`^${escapeRegex(params.title)}$`, "i") });
  }
  if (params.username) {
    duplicateConditions.push({ Username: new RegExp(`^${escapeRegex(params.username)}$`, "i") });
  }
  if (duplicateConditions.length > 0) {
    const duplicateSeller = await SellerModel.findOne({
      $or: duplicateConditions,
      _id: { $ne: id },
    });
    if (duplicateSeller) {
      throw new HttpError(400, "Title Or Username Already Exists!");
    }
  }

  const currentSeller = await SellerModel.findById(id);
  if (!currentSeller) {
    throw new HttpError(404, "Seller Not Found");
  }

  const passwordHash = params.password
    ? await PasswordService.hashPassword(params.password)
    : undefined;
  const encryptedMarzbanPassword = await CryptoService.encrypt(params.marzbanPassword);

  const tempSeller = new SellerModel({
    _id: id,
    Title: params.title ?? currentSeller.Title,
    Limit: params.limit ?? currentSeller.Limit,
    Username: params.username ?? currentSeller.Username,
    Password: passwordHash ?? currentSeller.Password,
    MarzbanUsername: params.marzbanUsername,
    MarzbanPassword: encryptedMarzbanPassword,
  });
  const validationError = tempSeller.validateSync?.();
  if (validationError) {
    throw new HttpError(400, validationError.message);
  }

  const updatedSeller = await SellerModel.findByIdAndUpdate(
    id,
    {
      ...(params.title ? { Title: params.title } : {}),
      ...(params.limit !== undefined ? { Limit: params.limit } : {}),
      ...(params.username ? { Username: params.username } : {}),
      ...(passwordHash ? { Password: passwordHash } : {}),
      MarzbanUsername: params.marzbanUsername,
      MarzbanPassword: encryptedMarzbanPassword,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedSeller) {
    throw new HttpError(404, "Seller Not Found");
  }

  return sanitizeSeller(updatedSeller);
};

export const removeSeller = async (id: string): Promise<{ deletedCount: number }> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const result = await SellerModel.findByIdAndDelete(id);
  if (!result) {
    throw new HttpError(404, "Seller Not Found!");
  }
  return { deletedCount: 1 };
};

export const toggleSellerStatus = async (id: string): Promise<string> => {
  if (!isValidObjectId(id)) {
    throw new HttpError(400, "Invalid seller id");
  }
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const seller = await SellerModel.findOne({ _id: new Types.ObjectId(id) });
  if (!seller) {
    throw new HttpError(404, "Seller Not Found!");
  }
  seller.Status = seller.Status === "Active" ? "Deactive" : "Active";
  await seller.save();
  return seller.Status;
};
