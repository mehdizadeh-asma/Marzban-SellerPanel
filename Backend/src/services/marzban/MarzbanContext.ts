import { getModel } from "../../db/MongooseModel";
import type { AuthenticatedRequest } from "../../middleware/auth";
import type { ISeller, SellerDocument } from "../../models/Seller";
import { SellerSchema } from "../../models/Seller";
import { isValidObjectId } from "../../utils/validation";

export const isAdminRequest = (req: AuthenticatedRequest): boolean => req.user?.role === "admin";

export const getSessionSeller = async (
  req: AuthenticatedRequest,
): Promise<SellerDocument | null> => {
  if (!req.user?.sellerId) return null;
  if (!isValidObjectId(req.user.sellerId)) return null;
  const SellerModel = await getModel<ISeller>("Seller", SellerSchema);
  return SellerModel.findById(req.user.sellerId);
};
