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
