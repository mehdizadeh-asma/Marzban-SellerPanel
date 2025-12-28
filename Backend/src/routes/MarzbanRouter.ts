import { Router } from "express";

import MarzbanController from "../controllers/MarzbanController";
import { authenticate, requireSellerOrAdmin } from "../middleware/auth";
import { createLoginRateLimiter } from "../middleware/rateLimit";

const router = Router();

const loginRateLimiter = createLoginRateLimiter();

router.post("/logintomarzban", loginRateLimiter, MarzbanController.Login);
router.use(authenticate);
router.get("/accounts/:seller/:isall", MarzbanController.GetAccounts);
router.get("/account/:seller/:search", MarzbanController.GetAccount);
router.post("/account", requireSellerOrAdmin, MarzbanController.AddAccount);
// router.put("/account", MarzbanController.EditAccount);
router.post("/disableaccount/:username", requireSellerOrAdmin, MarzbanController.DisableAccount);
router.post("/revokesub/:username", requireSellerOrAdmin, MarzbanController.RevokeSub);
router.post("/renewaccount/:seller", requireSellerOrAdmin, MarzbanController.RenewAccount);
router.delete("/account/:username", requireSellerOrAdmin, MarzbanController.RemoveAccount);

export default router;
