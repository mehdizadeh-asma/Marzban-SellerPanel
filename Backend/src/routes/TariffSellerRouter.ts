import { Router } from "express";

import TariffSellerController from "../controllers/TariffSellerController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/tariffSeller/:sellerId", TariffSellerController.GetTariffSellerListBySellerId);
// router.get("/tariffSeller/:id", TariffSellerController.GetTariffSeller);
router.post("/tariffSeller", TariffSellerController.AddTariffSeller);
router.put("/tariffSeller/:sellerId", TariffSellerController.AssignTariffSeller);
router.delete("/tariffSeller/:sellerId", TariffSellerController.RemoveTariffSellerBySellerId);

export default router;
