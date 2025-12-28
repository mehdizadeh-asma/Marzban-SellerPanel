import { Router } from "express";

import TariffInboundController from "../controllers/TariffInboundController";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/TariffInbound/:tariffId", TariffInboundController.GetTariffInboundListByTariffId);
router.put("/TariffInbound/:tariffId", TariffInboundController.AssignTariffInbound);

export default router;
