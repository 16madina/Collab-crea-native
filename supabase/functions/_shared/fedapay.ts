// Outils communs FedaPay (paiement Mobile Money des collaborations).
// Secrets à définir dans Supabase > Edge Functions > Secrets :
//   FEDAPAY_SECRET_KEY      clé secrète live (sk_live_…) — tableau de bord FedaPay > Api
//   FEDAPAY_WEBHOOK_SECRET  secret du webhook (wh_live_…) — tableau de bord FedaPay > Webhooks
//   FEDAPAY_MODE            optionnel : "sandbox" pour tester, sinon live
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fedapay-signature" };
export const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const fedapayBase = () =>
  (Deno.env.get("FEDAPAY_MODE") || "live") === "sandbox" ? "https://sandbox-api.fedapay.com/v1" : "https://api.fedapay.com/v1";

export const fedapayHeaders = () => {
  const key = Deno.env.get("FEDAPAY_SECRET_KEY");
  if (!key) throw new Error("Paiement indisponible : clé FedaPay non configurée");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };
};

/** Lecture JSON tolérante (FedaPay renvoie parfois un corps vide). */
export const safeJson = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
};

/** Frais de service payés par la marque (identique à computeCommission côté app et à confirm_collab_payment). */
export const brandTotal = (agreed: number) => agreed + Math.round(agreed * 0.1);

export type FedaTransaction = { id?: number | string; amount?: number | string; status?: string; currency?: { iso?: string } | string; custom_metadata?: Record<string, unknown>; mode?: string };

export const unwrapTransaction = (payload: any): FedaTransaction | null => {
  if (!payload || typeof payload !== "object") return null;
  return (payload["v1/transaction"] ?? payload) as FedaTransaction;
};

/** Relit la transaction chez FedaPay (on ne fait jamais confiance au téléphone ni au corps du webhook). */
export async function fetchTransaction(id: string): Promise<FedaTransaction> {
  const res = await fetch(`${fedapayBase()}/transactions/${id}`, { headers: fedapayHeaders() });
  const body = await safeJson(res);
  if (!res.ok) throw new Error(`Transaction FedaPay introuvable (${res.status})`);
  const tx = unwrapTransaction(body);
  if (!tx) throw new Error("Réponse FedaPay invalide");
  return tx;
}

const PAID = new Set(["approved", "transferred"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Si la transaction FedaPay est payée, contrôle montant / devise / collaboration
 * puis passe la collaboration en séquestre payé (fonction SQL réservée au serveur).
 */
export async function finalizePayment(admin: SupabaseClient, tx: FedaTransaction, expectedCollab?: string) {
  const txId = String(tx.id ?? "");
  const status = String(tx.status ?? "").toLowerCase();
  if (!/^\d+$/.test(txId)) throw new Error("Identifiant de transaction invalide");
  if (!PAID.has(status)) return { paid: false, status: status || "unknown" };

  const meta = tx.custom_metadata ?? {};
  const collabId = String(meta.collaboration_id ?? "");
  if (!UUID.test(collabId)) throw new Error("Transaction sans collaboration");
  if (expectedCollab && collabId !== expectedCollab) throw new Error("Cette transaction concerne une autre collaboration");

  const { data: c, error } = await admin.from("collaborations").select("id, brand_id, creator_id, agreed_amount").eq("id", collabId).single();
  if (error || !c) throw new Error("Collaboration introuvable");
  if (String(meta.brand_id ?? "") !== c.brand_id || String(meta.creator_id ?? "") !== c.creator_id) throw new Error("Transaction incohérente avec la collaboration");

  const amount = Number(tx.amount);
  const currency = typeof tx.currency === "string" ? tx.currency : String(tx.currency?.iso ?? "");
  if (amount !== brandTotal(Number(c.agreed_amount))) throw new Error(`Montant payé incorrect (${amount})`);
  if (currency.toUpperCase() !== "XOF") throw new Error("Devise incorrecte");

  const { data: result, error: rpcError } = await admin.rpc("confirm_collab_payment", {
    p_collab: collabId,
    p_reference: `fedapay-${txId}`,
    p_gateway_amount: amount,
  });
  if (rpcError) throw new Error(rpcError.message);
  return { paid: true, status, result, collaborationId: collabId };
}
