import { Router } from "express";
import { auth } from "../middleware/auth.js";
import  requireRole  from "../middleware/requireRole.js";
import {
  getBalance,
  topup,
  verifyPayement,
  manualTopup,
  userTransfer,
  getUserBalance
} from "../controllers/wallet.controller.js";

const router = Router();

router.get(
    "/balance",
    auth,
    requireRole("USER"),
    getBalance
);

router.post(
    "/topup",
    auth,
    requireRole("USER"),
    topup
);

router.post(
    "/verify",
    auth,
    requireRole("USER"),
    verifyPayement
);

router.post(
    "/manual-topup",
    auth,
    requireRole("TREASURER"),
    manualTopup
)

router.post(
    "/user-transfert",
    auth,
    requireRole("USER"),
    userTransfer
)

router.get(
    "/user-balance",
    auth,
    requireRole("OWNER"),
    getUserBalance
);

export default router;