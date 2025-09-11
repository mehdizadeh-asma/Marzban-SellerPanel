import { Router } from "express";

import TariffSellerController from "../controllers/TariffSellerController";

const router = Router();

router.get(
  "/tariffSeller/:sellerId",
  TariffSellerController.GetTariffSellerListBySellerId,
);
// router.get("/tariffSeller/:id", TariffSellerController.GetTariffSeller);
router.post("/tariffSeller", TariffSellerController.AddTariffSeller);
// router.put(
//   "/tariffSeller/:id",
//   TariffSellerController.ChangeStatusTariffSeller
// );
router.put(
  "/tariffSeller/:sellerid",
  TariffSellerController.AssignTariffSeller,
);
router.delete(
  "/tariffSeller/:sellerid",
  TariffSellerController.RemoveTariffSellerBySellerId,
);

export default router;
