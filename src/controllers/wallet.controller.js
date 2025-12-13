import prisma from "../config/prisma.js";
import { createCheckoutSumUp, getCheckoutStatusSumUp } from "../services/sumup.service.js";

/**
 * Récupérer le solde de l'utilisateur connecté
 */
export async function getBalance(req, res) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ 
        where: { id : userId},
        select:{ balance: true, identifiant: true }
    });
    if (!user) return res.status(404).json({ error: "utilisateur introuvable" });

    return res.status(200).json({ 
        //userId,
        identifiant : user.identifiant,
        balance : user.balance 
    });

  } catch (error) {
    console.error("Erreur getBalance:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Créer un paiement pour recharger le wallet
 * Utilise SumUp ou autre provider
 */
export async function topup(req, res) {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
    }

    // Création d'un checkout SumUp
    const checkout = await createCheckoutSumUp(amount, userId);

    // Retourne les infos nécessaires au front pour paiement
    return res.status(200).json({ checkout });
  } catch (error) {
    console.error("Erreur topup:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Vérifier le statut du paiement et créditer le wallet
 */
export async function verifyPayement(req, res) {
  try {
    const userId = req.user.userId;
    const { checkoutId } = req.body;

    if (!checkoutId) return res.status(400).json({ error: "checkoutId requis" });

    // Vérifier l'état du paiement via SumUp
    const status = await getCheckoutStatusSumUp(checkoutId);

    if (status !== "SUCCESS") {
      return res.status(422).json({ error: "Paiement non confirmé" });
    }

    // Récupérer montant
    const amount = status.amount;

    // Créditer le wallet
    const wallet = await prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    return res.status(200).json({
      message: "Wallet crédité avec succès",
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Erreur verify:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Crédit manuel du wallet
 * Accessible par TREASURER ou ADMIN
 */
export async function manualTopup(req, res) {
  try {
    const { identifiant, amount } = req.body;

    if (!identifiant || !amount || amount <= 0) {
      return res.status(400).json({ error: "identifiant et montant valides requis" });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({ 
        where: { identifiant: identifiant },
        //include: { id: true }
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    // Enregistrer la transaction
    const newTransaction = await prisma.transaction.create({
      data: { 
        userId: user.id,
        type: "rechargement",
        typeSource: "manuel",
        amount: amount
    }
    });

    // Créditer le wallet
    const wallet = await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: amount } },
    });

    return res.status(200).json({
      message: "Wallet crédité manuellement",
      balance: wallet.balance,
      amount:amount
    });

  } catch (error) {
    console.error("Erreur manualTopup:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Transfert d'argent d'un utilisateur à un autre
 */
export async function userTransfer(req, res) {
  try {
    const userId = req.user.userId;
    const { identifiant, amount } = req.body;

    if (!identifiant || !amount || amount <= 0) {
      return res.status(400).json({ error: "identifiant et montant valides requis" });
    }

    // Vérifier que le crediteur existe
    const debitedUser = await prisma.user.findUnique({ 
        where: { id: userId },
        //include: { id: true }
    });

    if (!debitedUser) return res.status(404).json({ error: "Utilisateur crediteur introuvable" });

    const debitedUserIdentifiant = debitedUser.identifiant

    if (debitedUser.identifiant == identifiant) return res.status(400).json({ error: "Ne peux pas transferer à soi même"});

    if (debitedUser.balance < amount) {
      return res.status(402).json({
        error: "Solde insuffisant",
        balance: debitedUser.balance,
        required: amount
      });
    }
    // Vérifier que le credité existe
    const creditedUser = await prisma.user.findUnique({ 
        where: { identifiant: identifiant },
        //include: { id: true }
    });

    if (!creditedUser) return res.status(404).json({ error: "Utilisateur crédité introuvable" });

    const creditedUserId = creditedUser.id;

    // Debiter le wallet
    const debitedWallet = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: -amount } },
    });

    // Créditer le wallet
    const creditedWallet = await prisma.user.update({
      where: { id: creditedUserId },
      data: { balance: { increment: amount } },
    });

    // Enregistrer la transaction
    await prisma.transaction.create({
      data: { 
        userId: creditedUserId,
        type: "transfert depuis",
        typeSource: debitedUserIdentifiant,
        amount: amount
    }
    });

    const newTransfer = await prisma.transaction.create({
      data: { 
        userId: userId,
        type: "transfert vers",
        typeSource: identifiant,
        amount: -amount
    }
    });

    const debitedUser2 = await prisma.user.findUnique({ 
        where: { id: userId },
    })

    return res.status(200).json({
      message: "Transfert effectué",
      to:identifiant,
      amount:amount,
      balance: debitedUser2.balance,
    });
  } catch (error) {
    console.error("Erreur userTransfer:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

/**
 * Récupérer le solde d'un utilisateur
 */
export async function getUserBalance(req, res) {
  try {
    const { userIdentifiant } = req.body;

    const user = await prisma.user.findUnique({ 
        where: { identifiant : userIdentifiant},
        select:{ balance: true, identifiant: true }
    });
    if (!user) return res.status(404).json({ error: "utilisateur introuvable" });

    return res.status(200).json({ 
        //userId,
        identifiant : user.identifiant,
        balance : user.balance 
    });

  } catch (error) {
    console.error("Erreur getBalance:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}