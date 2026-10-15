// Paiement réel Mobile Money via FedaPay (fonctions serveur supabase/functions/fedapay-*).
import { supabase } from "./supabase";

export type FedaStart = { transactionId: string; paymentUrl: string | null; pushSent: boolean; total: number };
export type FedaCheck = { paid: boolean; status: string };

/** Message d'erreur lisible renvoyé par une fonction serveur. */
async function fnError(error: unknown): Promise<string> {
  const res = (error as { context?: Response })?.context;
  if (res && typeof res.json === "function") {
    const body = await res.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return (error as Error)?.message || "Erreur de paiement";
}

export async function startFedaPayment(p: { collaborationId: string; provider: string; phone: string; country: string }): Promise<FedaStart> {
  const { data, error } = await supabase.functions.invoke("fedapay-collab-payment", { body: p });
  if (error) throw new Error(await fnError(error));
  return data as FedaStart;
}

export async function checkFedaPayment(transactionId: string, collaborationId: string): Promise<FedaCheck> {
  const { data, error } = await supabase.functions.invoke("fedapay-collab-verify", { body: { transactionId, collaborationId } });
  if (error) throw new Error(await fnError(error));
  return data as FedaCheck;
}
