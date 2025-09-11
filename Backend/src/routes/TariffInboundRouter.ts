import { Router } from "express";

import TariffInboundController from "../controllers/TariffInboundController";

const router = Router();

router.get("/TariffInbound/:tariffId", TariffInboundController.GetTariffInboundListByTariffId);

router.put("/TariffInbound/:tariffid", TariffInboundController.AssignTariffInbound);

export default router;
