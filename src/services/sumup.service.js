import SumUp from "@sumup/sdk";
import { number } from "zod";

const client = new SumUp({ apiKey: process.env.SUMUP_API_KEY ?? "" });

/** 
 * Créer un checkout (paiement) SumUp
 * @param {number} amount - montant à payer
 * @param {number} userId - ID interne de l'utilisateur
*/

export async function createCheckoutSumUp(amount, userId) {
  const checkout = await client.checkouts.create({
    amount: Number(amount),
    checkout_reference: `user_${userId}_${Date.now()}`,
    currency: "EUR",
    merchant_code: process.env.SUMUP_MERCHANT_CODE ?? "",
    //pay_to_email: process.env.SUMUP_PAY_TO_EMAIL ?? "",
    description: "Online payment via card widget",
  });

  console.log(checkout.id);
  return( checkout.id );
  // Return checkout.id to your webpage so the SumUp card widget can complete the payment.
}

/**
 * Vérifier le statut d'un paiement SumUp
 * @param {string} checkoutId
 */
export async function getCheckoutStatusSumUp(checkoutId) {
  try {
    const response = await client.checkouts.get(checkoutId);

    const { status, amount } = response.data;

    return {
      status, // "SUCCESS", "PENDING", "FAILED"
      amount,
    };
  } catch (error) {
    console.error("Erreur getCheckoutStatusSumUp:", error.response?.data || error.message);
    throw new Error("Impossible de récupérer le statut du checkout");
  }
}