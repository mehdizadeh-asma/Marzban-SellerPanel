import { Router } from "express";

import AccountController from "../controllers/AccountController";

const router = Router();

// router.get("/accounts", AccountController.GetAccountList);
// router.get("/account/:id", AccountController.GetAccount);
// router.post("/account", AccountController.AddAccount);
// router.put("/account/:id", AccountController.EditAccount);
// router.delete("/account/:id", AccountController.RemoveAccount);
router.post("/payaccount/:id", AccountController.PayAccount);
router.post("/payaccounts", AccountController.PayAccounts);
// router.post("/converttariff", AccountController.ConvertTariff);

export default router;
