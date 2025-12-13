import { Router } from "express";
import { auth } from "../middleware/auth.js";
import  requireRole  from "../middleware/requireRole.js";
import {
  createProduct,
  getProductByShop,
  updateProduct,
  deleteProduct,
  buyProducts,
  manualBuyProducts,
} from "../controllers/product.controller.js";

const router = Router();

router.post(
  "/create",
  auth,
  requireRole("OWNER"),
  createProduct
);

router.get(
  "/shop/getProducts",
  auth,
  getProductByShop
);

router.put(
  "/edit",
  auth,
  requireRole("OWNER"),
  updateProduct
);

router.delete(
  "/delete",
  auth,
  requireRole("OWNER"),
  deleteProduct
);

router.post(
  "/buy",
  auth,
  requireRole("USER"),
  buyProducts
);

router.post(
  "/manual-buy",
  auth,
  requireRole("TREASURER"),
  manualBuyProducts
);



export default router;