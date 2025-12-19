import { Router } from "express";

import MarzbanController from "../controllers/MarzbanController";

const router = Router();

router.post("/logintomarzban", MarzbanController.Login);
router.get("/accounts/:seller/:isall", MarzbanController.GetAccounts);
router.get("/account/:seller/:search", MarzbanController.GetAccount);
router.post("/account", MarzbanController.AddAccount);
// router.put("/account", MarzbanController.EditAccount);
router.post("/disableaccount/:username", MarzbanController.DisableAccount);
router.post("/revokesub/:username", MarzbanController.RevokeSub);
router.post("/renewaccount/:seller", MarzbanController.RenewAccount);
router.delete("/account/:username", MarzbanController.RemoveAccount);

export default router;
