import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import fs from "fs";
import { parse } from "csv-parse";

const loginTokenTimeToExpire = "12h"
const refreshTokenTimeToExpire = "1d"

/**
 * Crée un nouvel utilisateur
 * Accessible uniquement par ADMIN
 */
export async function register(req, res) {
  try {
    const { identifiant, fams, proms, password, role } = req.body;

    // 1️⃣ Validation basique
    if (!identifiant || !password || !role) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // 2️⃣ Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: {identifiant},
    });

    if (existingUser) {
      return res.status(400).json({ error: "Utilisateur déjà existant" });
    }

    // 3️⃣ Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Créer l'utilisateur en DB
    const newUser = await prisma.user.create({
      data: {
        identifiant,
        password: hashedPassword,
        role,
        fams,
        proms  
      },
    });

    return res.status(201).json({
      message: "Utilisateur créé",
      userId: newUser.id,
      identifiant: newUser.identifiant,
      role: newUser.role,
    });
  } catch (error) {
    console.error("Erreur register:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Ajoute plusieurs utilisateurs en même temps graçe à une liste
 */


export async function batchImport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    const filePath = req.file.path;

    const usersToCreate = [];
    const invalidLines = [];

    const parser = fs
      .createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }));

    for await (const row of parser) {
      const { identifiant, fams, proms, password, role } = row;

      // Validation minimale
        if (!identifiant || !password) {
            invalidLines.push(row);
            continue;
        }

      // 2️⃣ Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({
            where: {identifiant},
        });

        if (existingUser) {
            invalidLines.push(row);
            continue;
        }

      const hashedPassword = await bcrypt.hash(password, 10);

      usersToCreate.push({
        identifiant,
        fams,
        proms,
        password: hashedPassword,
        role: role || "USER",
      });
    }

    // Création en batch
    const created = await prisma.user.createMany({
      data: usersToCreate
    });

    // Suppression du fichier uploadé
    fs.unlinkSync(filePath);

    return res.status(200).json({
      message: "Import terminé",
      createdCount: created.count,
      invalidLines
    });

  } catch (error) {
    console.error("Erreur import CSV:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Connecte un utilisateur
 * Retourne JWT + infos utilisateur
 */
export async function login(req, res) {
  try {
    const { identifiant, password } = req.body;

    // 1️⃣ Validation basique
    if (!identifiant || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis" });
    }

    // 2️⃣ Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { identifiant },
    });

    if (!user) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    // 3️⃣ Vérifier mot de passe
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    // 4️⃣ Générer JWT
    const token = jwt.sign(
      { userId: user.id, userIdentifiant : user.identifiant, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: loginTokenTimeToExpire } // durée à ajuster
    );

    // Generer refresh token
    const refreshToken = jwt.sign(
        { userId: user.id }, 
        process.env.REFRESH_JWT_SECRET, 
        {expiresIn: refreshTokenTimeToExpire}
    );
    // Sauvegarde refresh token en DB
    await prisma.refreshToken.create({
        data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 jours
    },
  });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        identifiant: user.identifiant,
        role: user.role,
      },
      refreshToken
    });
  } catch (error) {
    console.error("Erreur login:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}


//Modification du mot de passe par un utilisateur

export async function editPassword(req, res) {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword1, newPassword2 } = req.body;

    // 1️⃣ Validation des champs
    if (!oldPassword || !newPassword1 || !newPassword2) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Recupération de l'utilisateur
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Verification de l'ancien mot de passe
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Mot de passe actuel incorrect" });
    }

    // Verification que l'utilisateur a bien rentré le même nouveau mdp
    if (newPassword1 != newPassword2) {
      return res.status(400).json({ error: "Le nouveau mot de passe et sa confirmation ne correspondent pas" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword1, 10);

    // Modifier le mot de passe
    const newUser = await prisma.user.update({
      where: {id: userId},
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      message: "Mot de passe modifié avec succès !",
    });
  } catch (error) {
    console.error("Erreur editPassword:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

//Reinitialisation du MDP par un admin, seul un ADMIN peut realiser cette opération

export async function adminPasswordReset(req, res) {
  try {
    const { identifiant, newPassword1, newPassword2 } = req.body;

    // 1️⃣ Validation des champs
    if (!identifiant || !newPassword1 || !newPassword2) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Recupération de l'utilisateur
    const user = await prisma.user.findUnique({ where: { identifiant: identifiant } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    const userId = user.id
    
    // Verification que l'admin a bien rentré le même nouveau mdp
    if (newPassword1 != newPassword2) {
      return res.status(400).json({ error: "Le nouveau mot de passe et sa confirmation ne correspondent pas" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(newPassword1, 10);

    // Modifier le mot de passe
    const newUser = await prisma.user.update({
      where: {id: userId},
      data: { password: hashedPassword },
    });

    return res.status(200).json({
      message: "Mot de passe reinitialisé avec succès !",
      identifiant : identifiant
    });
  } catch (error) {
    console.error("Erreur adminPasswordReset:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Rafraichissement du Token
 */

export async function refreshToken(req, res) {

  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ error: "Refresh token necessaire" });

  // Vérifier si token existe en DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });
  if (!storedToken) return res.status(403).json({ error: "Refresh token invalide" });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET);

    // Générer nouveau access token
    
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    //const accessToken = generateAccessToken(user);

    const token = jwt.sign(
      { userId: user.id, userIdentifiant : user.identifiant, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: loginTokenTimeToExpire } // durée à ajuster
    );

    return res.status(201).json({ token });
  } catch (err) {
    return res.status(403).json({ error: "Refresh token expiré ou invalide" });
  }
}

/**
 * Suppression refresh token pour deconnection
 */

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token requis" });

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  return res.json({ message: "Déconnecté avec succès" });
}
