import { Router } from "express";

import TariffController from "../controllers/TariffController";
import { authenticate, requireAdmin, requireSellerOrAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/tariffs/:isall/:title", requireSellerOrAdmin, TariffController.GetTariffList);
// router.get("/tariff/:id", TariffController.GetTariff);
router.post("/tariff", requireAdmin, TariffController.AddTariff);
// router.put("/tariff/:id", TariffController.EditTariff);
// router.delete("/tariff/:id", TariffController.RemoveTariff);
router.post("/disabletariff/:id", requireAdmin, TariffController.DisableTariff);
router.post("/freechanged/:id", requireAdmin, TariffController.FreeChanged);

export default router;
