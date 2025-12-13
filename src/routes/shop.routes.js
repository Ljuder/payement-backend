import { Router } from "express";
import { auth } from "../middleware/auth.js";
import  requireRole  from "../middleware/requireRole.js";
import {
  createShop,
  getAllShops,
  updateShop,
  deleteShop,
  exportShopOperations,
  createShopCategory,
  getAllShopCategories,
  updateShopCategory,
  deleteShopCategory
} from "../controllers/shop.controller.js";

const router = Router();

/**
 * ROUTE: POST /shops
 * ACCÈS: TRÉSORIER ou ADMIN
 * RÔLE: Créer un magasin
 */
router.post(
  "/create",
  auth,                            // Vérifie JWT
  requireRole("TREASURER"),        // Rôle minimum requis
  createShop                        // Contrôleur
);

/**
 * ROUTE: GET /shops
 * ACCÈS: Tout utilisateur connecté
 * RÔLE: Liste tous les magasins
 */
router.get(
  "/",
  auth,
  getAllShops
);

/**
 * ROUTE: PUT /shops/:id
 * ACCÈS: TRÉSORIER ou ADMIN
 * RÔLE: Modifier un magasin existant
 */
router.put(
  "/update",
  auth,
  requireRole("TREASURER"),
  updateShop
);

/**
 * ROUTE: DELETE /shops/:id
 * ACCÈS: TRÉSORIER ou ADMIN
 * RÔLE: Supprimer un magasin
 */
router.delete(
  "/delete",
  auth,
  requireRole("TREASURER"),
  deleteShop
);

router.get(
  //"/shops/:shopId/operations", 
  "/operations",
  auth, 
  requireRole("TREASURER"), 
  exportShopOperations
);

// Gestion des categories INWORK

router.post(
  "/categories/create",
  auth,                    
  requireRole("OWNER"),       
  createShopCategory                      
);

router.get(
  "/categories",
  auth,
  getAllShopCategories
);

router.put(
  "/categories/update",
  auth,
  requireRole("OWNER"),
  updateShopCategory
);

router.delete(
  "/categories/delete",
  auth,
  requireRole("OWNER"),
  deleteShopCategory
);

export default router;
