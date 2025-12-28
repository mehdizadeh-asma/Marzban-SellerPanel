import type { SellerDocument } from "../../models/Seller";
import AccountHelpers from "../account/AccountHelpers";

export const tryUpsertMarzbanAccountCache = async (
  label: string,
  authorization: string | undefined,
  seller: SellerDocument,
  username: string,
): Promise<void> => {
  try {
    const marzbanAccount = await AccountHelpers.GetMarzbanAccountByUsername(
      authorization,
      seller,
      username,
    );
    if (marzbanAccount) {
      AccountHelpers.UpsertMarzbanAccountCache(seller.Title, marzbanAccount);
    }
  } catch (error) {
    console.log(`[${label}] Failed to patch Marzban cache:`, error);
  }
};
