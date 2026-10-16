// Paiement réel Mobile Money (fonctions serveur supabase/functions/fedapay-* et feexpay-*).
import { supabase } from "./supabase";

export type Gateway = "fedapay" | "feexpay";

// Prestataire utilisé pour chaque opérateur. Wave passera sur FeexPay dès que la « clé agrégée Wave »
// sera activée (FeexPay > Configuration) ; Orange n'existe que chez FeexPay sur ce compte.
export const GATEWAY: Record<string, Gateway> = { Orange: "feexpay", Wave: "fedapay", MTN: "fedapay", Moov: "fedapay" };

export type PayStart = { transactionId: string; paymentUrl: string | null; pushSent: boolean; total: number; gateway: Gateway };
export type PayCheck = { paid: boolean; status: string };

/** Message d'erreur lisible renvoyé par une fonction serveur. */
async function fnError(error: unknown): Promise<string> {
  const res = (error as { context?: Response })?.context;
  if (res && typeof res.json === "function") {
    const body = await res.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return (error as Error)?.message || "Erreur de paiement";
}

export async function startPayment(p: { collaborationId: string; operator: string; phone: string; country: string }): Promise<PayStart> {
  const gateway = GATEWAY[p.operator] ?? "fedapay";
  const { data, error } = await supabase.functions.invoke(`${gateway}-collab-payment`, {
    body: { collaborationId: p.collaborationId, provider: p.operator.toLowerCase(), phone: p.phone, country: p.country },
  });
  if (error) throw new Error(await fnError(error));
  return { ...(data as Omit<PayStart, "gateway">), gateway };
}

export async function checkPayment(gateway: Gateway, transactionId: string, collaborationId: string): Promise<PayCheck> {
  const { data, error } = await supabase.functions.invoke(`${gateway}-collab-verify`, { body: { transactionId, collaborationId } });
  if (error) throw new Error(await fnError(error));
  return data as PayCheck;
}
