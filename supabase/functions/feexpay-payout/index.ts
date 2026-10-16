// Retrait d'un créateur via FeexPay (payout Mobile Money), déclenché par l'admin dans l'app.
//   action "send"  : verrouille la demande, envoie le virement FeexPay, puis la marque effectuée / échouée
//                    (ou « en cours » si FeexPay n'a pas encore confirmé)
//   action "check" : relit chez FeexPay le statut d'un virement « en cours »
// La fin d'un virement « en cours » arrive aussi par feexpay-webhook (reconnu par sa référence FeexPay).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json } from "../_shared/fedapay.ts";
import { fetchPayoutStatus, PAYOUT_NETWORKS, PayoutRefused, payoutNet, sendPayout, settlePayout } from "../_shared/feexpay.ts";

const DIAL = "225";
const LOCAL_LEN = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Connecte-toi d'abord" }, 401);
    const { data: isAdmin } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    const { withdrawalId, action = "send" } = await req.json().catch(() => ({}));
    const id = String(withdrawalId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Demande invalide" }, 400);

    if (action === "check") {
      const { data: w } = await admin.from("withdrawal_requests").select("status, transaction_id").eq("id", id).maybeSingle();
      if (!w) return json({ error: "Demande introuvable" }, 404);
      if (w.status !== "processing") return json({ state: w.status });
      if (!w.transaction_id) return json({ error: "Aucune référence FeexPay pour ce virement" }, 409);
      return json(await settlePayout(admin, id, await fetchPayoutStatus(w.transaction_id)));
    }

    // Verrouille la demande (pending -> processing) avant tout envoi : un double clic ne peut pas payer deux fois.
    const { data: w, error: startError } = await admin.rpc("withdrawal_payout_start", { p_id: id, p_admin: user.id });
    if (startError) return json({ error: startError.message }, 409);

    const network = PAYOUT_NETWORKS[String(w.mobile_provider ?? "").toLowerCase()];
    let digits = String(w.mobile_number ?? "").replace(/\D/g, "");
    if (digits.startsWith(DIAL) && digits.length > LOCAL_LEN) digits = digits.slice(DIAL.length);
    const problem = !network ? `Opérateur non pris en charge (${w.mobile_provider ?? "—"})` : digits.length !== LOCAL_LEN ? `Numéro invalide (${LOCAL_LEN} chiffres attendus)` : null;
    if (problem) {
      await admin.rpc("withdrawal_payout_failed", { p_id: id, p_reason: problem });
      return json({ error: `${problem} : le retrait est refusé et le solde recrédité` }, 400);
    }

    let sent;
    try {
      sent = await sendPayout({ phoneNumber: `${DIAL}${digits}`, amount: payoutNet(Number(w.amount)), network });
    } catch (e) {
      if (!(e instanceof PayoutRefused)) {
        // Pas de réponse claire de FeexPay : l'argent est peut-être parti. On laisse « en cours » sans recréditer.
        console.error("[FEEXPAY-PAYOUT] sans réponse", id, e);
        return json({ error: "FeexPay n'a pas répondu : le retrait reste « en cours ». Vérifie dans FeexPay > Reversements avant toute autre action." }, 502);
      }
      await admin.rpc("withdrawal_payout_failed", { p_id: id, p_reason: e.message });
      return json({ error: `${e.message} : le retrait est refusé et le solde recrédité` }, 502);
    }
    return json({ ...(await settlePayout(admin, id, sent)), amount: payoutNet(Number(w.amount)), network });
  } catch (e) {
    console.error("[FEEXPAY-PAYOUT]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur de virement" }, 500);
  }
});
