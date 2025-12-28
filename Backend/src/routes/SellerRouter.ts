import { Router } from "express";

import SellerController from "../controllers/SellerController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/sellers", authenticate, requireAdmin, SellerController.GetSellerList);
// router.get("/seller/:id", SellerController.GetSeller);
router.post("/seller", authenticate, requireAdmin, SellerController.AddSeller);
router.put("/seller/:id", authenticate, requireAdmin, SellerController.EditSeller);
router.delete("/seller/:id", authenticate, requireAdmin, SellerController.RemoveSeller);
router.post("/disableseller/:id", authenticate, requireAdmin, SellerController.DisableSeller);

export default router;
