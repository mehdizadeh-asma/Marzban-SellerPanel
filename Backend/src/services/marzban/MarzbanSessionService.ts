import ConfigFile from "../../config/Config";
import { getModel } from "../../db/MongooseModel";
import type { ISeller } from "../../models/Seller";
import { SellerSchema } from "../../models/Seller";
import { HttpError } from "../../utils/HttpError";
import AccountHelpers from "../account/AccountHelpers";
import { AuthService } from "../auth/AuthService";
import { CryptoService } from "../security/CryptoService";
import { PasswordService } from "../security/PasswordService";

export const login = async (
  username?: string,
  password?: string,
): Promise<Record<string, unknown>> => {
  const normalizedUsername = username?.trim();
  const normalizedPassword = password?.trim();
  if (!normalizedUsername || !normalizedPassword) {
    throw new HttpError(400, "Username and password are required");
  }

  const sellerUsername = await ConfigFile.GetSellerAdminUsername();
  const sellerPassword = await ConfigFile.GetSellerAdminPassword();

  if (normalizedUsername.toLowerCase() === sellerUsername.toLowerCase()) {
    if (normalizedPassword !== sellerPassword) {
      throw new HttpError(401, "Invalid Account Information");
    }
    const marzbanUsername = await ConfigFile.GetMarzbanUsername();
    const marzbanPassword = await ConfigFile.GetMarzbanPassword();
    const marzbanToken = await AccountHelpers.LoginToMarzban(marzbanUsername, marzbanPassword);
    const totalUnpaid = await AccountHelpers.GetTotalUnpaid(undefined, true);
    const session = await AuthService.createSessionAndToken({
      role: "admin",
      marzbanToken: `Bearer ${marzbanToken}`,
    });
    return {
      accessToken: session.accessToken,
      tokenType: "Bearer",
      expiresAt: session.expiresAt.toISOString(),
      Username: sellerUsername,
      IsAdmin: true,
      Limit: 0,
      TotalPrice: totalUnpaid.TotalPriceUnpaid,
    };
  }

  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  const seller = await SellerModel.findOne({
    Username: normalizedUsername,
    Status: "Active",
  });

  if (!seller || !(await PasswordService.verifyPassword(normalizedPassword, seller.Password))) {
    throw new HttpError(401, "Invalid Account Information");
  }

  if (!PasswordService.isBcryptHash(seller.Password)) {
    seller.Password = await PasswordService.hashPassword(normalizedPassword);
    await seller.save();
  }

  const decryptedMarzbanPassword = await CryptoService.decrypt(seller.MarzbanPassword);
  const marzbanToken = await AccountHelpers.LoginToMarzban(
    seller.MarzbanUsername,
    decryptedMarzbanPassword,
  );

  if (new Date().getDay() === 5 && (await ConfigFile.GetDeletePaidAndRemovedUsers()) === "Yes") {
    await AccountHelpers.RemoveDeletedAccountSeller(`Bearer ${marzbanToken}`, seller);
  }

  const totalUnpaid = await AccountHelpers.GetTotalUnpaid(seller, false);
  const session = await AuthService.createSessionAndToken({
    role: "seller",
    userId: seller._id,
    sellerId: seller._id,
    marzbanToken: `Bearer ${marzbanToken}`,
  });

  return {
    accessToken: session.accessToken,
    tokenType: "Bearer",
    expiresAt: session.expiresAt.toISOString(),
    Username: seller.Title,
    IsAdmin: false,
    Limit: seller.Limit - totalUnpaid.TotalLimitUnpaid,
    TotalPrice: totalUnpaid.TotalPriceUnpaid,
  };
};
