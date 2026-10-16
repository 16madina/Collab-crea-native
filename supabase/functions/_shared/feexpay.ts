// Outils communs FeexPay (paiement Mobile Money des collaborations : Orange, Wave… en Côte d'Ivoire).
// Secrets à définir dans Supabase > Edge Functions > Secrets :
//   FEEXPAY_API_KEY   clé privée (fp_…) — tableau de bord FeexPay > Développeurs
//   FEEXPAY_SHOP_ID   identifiant de la boutique — tableau de bord FeexPay > Développeurs
// FeexPay ne signe pas ses webhooks : on relit donc toujours le statut chez FeexPay avant de valider.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandTotal } from "./fedapay.ts";

export const FEEXPAY_API = "https://api-v2.feexpay.me/api";

export const feexpayConfig = () => {
  const key = Deno.env.get("FEEXPAY_API_KEY");
  const shop = Deno.env.get("FEEXPAY_SHOP_ID");
  if (!key || !shop) throw new Error("Paiement indisponible : clés FeexPay non configurées");
  return { shop, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" } };
};

/** Lien entre une transaction FeexPay et une collaboration (renvoyé tel quel par FeexPay). */
export const callbackInfo = (collabId: string) => `collab:${collabId}`;
/** Lien entre un virement (payout) FeexPay et une demande de retrait. */
export const payoutCallbackInfo = (withdrawalId: string) => `withdrawal:${withdrawalId}`;

export type FeexStatus = { reference?: string; amount?: number | string; status?: string; callback_info?: string | null; reason?: string };

export async function fetchFeexStatus(reference: string): Promise<FeexStatus> {
  const res = await fetch(`${FEEXPAY_API}/transactions/public/single/status/${encodeURIComponent(reference)}`, { headers: feexpayConfig().headers });
  const text = await res.text();
  let body: FeexStatus = {};
  try {
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    // corps illisible : traité comme introuvable
  }
  if (!res.ok) throw new Error(`Transaction FeexPay introuvable (${res.status})`);
  return body;
}

/**
 * Si FeexPay confirme le paiement, contrôle le montant et la collaboration
 * puis passe la collaboration en séquestre payé (confirm_collab_payment, réservée au serveur).
 */
export async function finalizeFeexPayment(admin: SupabaseClient, tx: FeexStatus, expectedCollab?: string) {
  const ref = String(tx.reference ?? "");
  const status = String(tx.status ?? "").toUpperCase();
  if (!ref) throw new Error("Référence FeexPay manquante");
  if (status !== "SUCCESSFUL") return { paid: false, status: status === "FAILED" ? "declined" : status.toLowerCase() || "pending", reason: tx.reason || undefined };

  const collabId = String(tx.callback_info ?? "").replace(/^collab:/, "");
  if (!/^[0-9a-f-]{36}$/i.test(collabId)) throw new Error("Transaction sans collaboration");
  if (expectedCollab && collabId !== expectedCollab) throw new Error("Cette transaction concerne une autre collaboration");

  const { data: c, error } = await admin.from("collaborations").select("id, agreed_amount").eq("id", collabId).single();
  if (error || !c) throw new Error("Collaboration introuvable");
  const amount = Number(tx.amount);
  if (amount !== brandTotal(Number(c.agreed_amount))) throw new Error(`Montant payé incorrect (${amount})`);

  const { data: result, error: rpcError } = await admin.rpc("confirm_collab_payment", {
    p_collab: collabId,
    p_reference: `feexpay-${ref}`,
    p_gateway_amount: amount,
  });
  if (rpcError) throw new Error(rpcError.message);
  return { paid: true, status: "approved", result, collaborationId: collabId };
}

// ─────────────── Virements (payout) vers le Mobile Money des créateurs ───────────────

/** Réseaux FeexPay pour les virements, par opérateur choisi dans l'app (Côte d'Ivoire). */
export const PAYOUT_NETWORKS: Record<string, string> = { wave: "WAVE CI", orange: "ORANGE CI", mtn: "MTN CI", moov: "MOOV CI" };
/** Frais de retrait affichés au créateur dans l'app (« ~2 % ») : on vire le montant net. */
export const payoutNet = (amount: number) => amount - Math.round(amount * 0.02);

/** FeexPay a explicitement refusé le virement (aucun argent n'est parti). */
export class PayoutRefused extends Error {}

export type PayoutStatus = { reference?: string; status?: string; amount?: number | string; callback_info?: string | null; reason?: string; message?: string };

const readJson = async (res: Response): Promise<Record<string, unknown>> => {
  const text = await res.text();
  try {
    return text.trim() ? JSON.parse(text) : {};
  } catch {
    return { message: text.slice(0, 300) };
  }
};

/** Envoie un virement FeexPay. Renvoie la réponse brute (reference, status…) ou lève une erreur lisible. */
export async function sendPayout(p: { phoneNumber: string; amount: number; network: string; withdrawalId: string }) {
  const { shop, headers } = feexpayConfig();
  const res = await fetch(`${FEEXPAY_API}/payouts/public/transfer/global`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      phoneNumber: p.phoneNumber,
      amount: p.amount,
      shop,
      network: p.network,
      motif: "Collab Crea retrait",
      callback_info: payoutCallbackInfo(p.withdrawalId),
    }),
  });
  const body = await readJson(res);
  if (!res.ok) {
    console.error("[FEEXPAY-PAYOUT] envoi", res.status, JSON.stringify(body).slice(0, 500));
    // Erreur serveur FeexPay : issue incertaine (l'argent est peut-être parti) -> pas un refus.
    if (res.status >= 500) throw new Error(`FeexPay indisponible (${res.status})`);
    const raw = JSON.stringify(body).toLowerCase();
    if (raw.includes("solde") || raw.includes("balance") || raw.includes("insufficient")) throw new PayoutRefused("Solde FeexPay insuffisant pour ce virement");
    throw new PayoutRefused(String(body.message || `FeexPay a refusé le virement (${res.status})`));
  }
  return body as PayoutStatus;
}

/** Relit le statut d'un virement chez FeexPay. */
export async function fetchPayoutStatus(reference: string): Promise<PayoutStatus> {
  const res = await fetch(`${FEEXPAY_API}/payouts/status/public/${encodeURIComponent(reference)}`, { headers: feexpayConfig().headers });
  const body = await readJson(res);
  if (!res.ok) throw new Error(`Virement FeexPay introuvable (${res.status})`);
  return body as PayoutStatus;
}

/** Applique le statut FeexPay d'un virement à la demande de retrait (effectué / échoué / toujours en cours). */
export async function settlePayout(admin: SupabaseClient, withdrawalId: string, tx: PayoutStatus) {
  const status = String(tx.status ?? "").toUpperCase();
  const ref = tx.reference ? String(tx.reference) : null;
  if (status === "SUCCESSFUL") {
    const { error } = await admin.rpc("withdrawal_payout_done", { p_id: withdrawalId, p_ref: ref });
    if (error) throw new Error(error.message);
    return { state: "completed" as const, reference: ref };
  }
  if (status === "FAILED") {
    const reason = String(tx.reason || tx.message || "refusé par l'opérateur");
    const { error } = await admin.rpc("withdrawal_payout_failed", { p_id: withdrawalId, p_reason: reason });
    if (error) throw new Error(error.message);
    return { state: "failed" as const, reference: ref, reason };
  }
  if (ref) await admin.rpc("withdrawal_payout_set_ref", { p_id: withdrawalId, p_ref: ref });
  return { state: "processing" as const, reference: ref };
}
