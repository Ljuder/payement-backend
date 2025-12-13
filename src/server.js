import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

// Import des routes
import authRoutes from "./routes/auth.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import productRoutes from "./routes/product.routes.js";
import walletRoutes from "./routes/wallet.routes.js";

// Middlewares
import { auth } from "./middleware/auth.js";

dotenv.config();

const app = express();

// 🔹 Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // Logs des requêtes

// 🔹 Route racine
app.get("/", (req, res) => {
  res.status(200).json({ message: "API Payment Platform en ligne" });
});

// 🔹 Routes publiques
app.use("/auth", authRoutes);

// 🔹 Routes protégées
app.use("/shops", auth, shopRoutes);
app.use("/products", auth, productRoutes);
app.use("/wallet", auth, walletRoutes);

// 🔹 Middleware 404
app.use((req, res) => {
  res.status(404).json({ error: "Route non trouvée" });
});

// 🔹 Middleware gestion erreurs global
app.use((err, req, res, next) => {
  console.error("Erreur globale:", err);
  res.status(500).json({ error: "Erreur serveur" });
});

// 🔹 Démarrage du serveur
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
