import { Router } from "express";

import TariffController from "../controllers/TariffController";

const router = Router();

router.get("/tariffs/:isall/:title", TariffController.GetTariffList);
// router.get("/tariff/:id", TariffController.GetTariff);
router.post("/tariff", TariffController.AddTariff);
// router.put("/tariff/:id", TariffController.EditTariff);
// router.delete("/tariff/:id", TariffController.RemoveTariff);
router.post("/disabletariff/:id", TariffController.DisableTariff);
router.post("/freechanged/:id", TariffController.FreeChanged);

export default router;
