import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.js";
import  requireRole  from "../middleware/requireRole.js";
import { 
    register, 
    login, 
    editPassword, 
    adminPasswordReset, 
    batchImport,
    refreshToken,
    logout
} from "../controllers/auth.controller.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

/**
 * ROUTE: POST /auth/register
 * ACCÈS: ADMIN uniquement
 * RÔLE: Créer un utilisateur avec un rôle spécifique
 */
router.post(
  "/register",
  auth,                       // Vérifie JWT
  requireRole("ADMIN"),       // Vérifie que l'utilisateur est admin
  register                    // Appelle la logique du contrôleur
);

/**
 * Ajout par un admin de plusieurs utilisateurs via un csv
 */

router.post(
    "/batch-import", 
    auth, 
    requireRole("ADMIN"), 
    upload.single("file"), 
    batchImport
);

/**
 * ROUTE: POST /auth/login
 * ACCÈS: Public
 * RÔLE: Authentifier l'utilisateur et retourner un JWT
 */
router.post("/login", login);

router.put(
    "/editPassword",
    auth,
    requireRole("USER"),
    editPassword
)

router.put(
    "/adminPasswordReset",
    auth,
    requireRole("ADMIN"),
    adminPasswordReset
)

router.post(
    "/refresh",
    refreshToken
)

router.post(
    "/logout",
    auth,
    logout
)

export default router;