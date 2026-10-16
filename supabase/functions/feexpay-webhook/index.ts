// Webhook FeexPay : FeexPay prévient le serveur quand une transaction change d'état.
// URL à déclarer dans FeexPay > Webhooks : https://qsbkwdtchhzclpxjrhnt.supabase.co/functions/v1/feexpay-webhook
// Les webhooks FeexPay ne sont pas signés : on ne lit que la référence, puis on relit le statut chez FeexPay.
// Paiements des marques (callback_info = collab:<id>) et virements aux créateurs (retrait « en cours » portant cette référence).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json } from "../_shared/fedapay.ts";
import { fetchFeexStatus, fetchPayoutStatus, finalizeFeexPayment, settlePayout } from "../_shared/feexpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const event = await req.json().catch(() => null);
    const reference = String(event?.reference ?? event?.order_id ?? "");
    if (!/^[\w-]{6,80}$/.test(reference)) return json({ error: "Référence absente" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Virement à un créateur : retrait « en cours » enregistré avec cette référence FeexPay.
    const { data: w } = await admin.from("withdrawal_requests").select("id, status").eq("transaction_id", reference).maybeSingle();
    if (w && w.status !== "processing") return json({ received: true, ignored: "retrait déjà traité" });
    if (w) {
      const settled = await settlePayout(admin, w.id, await fetchPayoutStatus(reference));
      console.log("[FEEXPAY-WEBHOOK] virement", reference, JSON.stringify(settled));
      return json({ received: true });
    }
    const result = await finalizeFeexPayment(admin, await fetchFeexStatus(reference));
    console.log("[FEEXPAY-WEBHOOK]", reference, JSON.stringify(result));
    return json({ received: true });
  } catch (e) {
    console.error("[FEEXPAY-WEBHOOK]", e);
    return json({ error: "Traitement du webhook impossible" }, 500);
  }
});
