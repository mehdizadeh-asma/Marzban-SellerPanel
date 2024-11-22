import { Router } from "express";

import SellerController from "../controllers/SellerController";

const router = Router();

router.get("/sellers", SellerController.GetSellerList);
// router.get("/seller/:id", SellerController.GetSeller);
router.post("/seller", SellerController.AddSeller);
router.put("/seller/:id", SellerController.EditSeller);
router.delete("/seller/:id", SellerController.RemoveSeller);
router.post("/disableseller/:id", SellerController.DisableSeller);

export default router;
