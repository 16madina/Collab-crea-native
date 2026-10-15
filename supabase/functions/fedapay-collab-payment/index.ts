// Paiement en séquestre d'une collaboration par Mobile Money (FedaPay).
// Crée une transaction FedaPay et renvoie soit la page de paiement (Wave…), soit l'envoi direct
// d'une demande de confirmation sur le téléphone (MTN, Moov). Le paiement est confirmé ensuite par
// fedapay-collab-verify (l'app vérifie) et fedapay-webhook (FedaPay prévient le serveur).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandTotal, cors, fedapayBase, fedapayHeaders, json, safeJson } from "../_shared/fedapay.ts";

// Opérateur + pays -> mode FedaPay. Seuls les modes activés sur le compte FedaPay fonctionnent
// (Orange Money doit être activé par FedaPay avant d'être proposé dans l'app).
const MODES: Record<string, Record<string, string>> = {
  wave: { CI: "wave_ci", SN: "wave_sn" },
  orange: { CI: "orange_money_ci", SN: "orange_money_sn", BF: "orange_money_bf" },
  mtn: { BJ: "mtn", CI: "mtn_ci" },
  moov: { BJ: "moov", TG: "moov_tg" },
};
// Modes sans redirection : FedaPay envoie la demande directement sur le téléphone.
// Wave passe obligatoirement par la page de paiement (qui ouvre l'app Wave).
const DIRECT = new Set(["mtn", "mtn_ci", "moov", "moov_tg"]);
const DIAL: Record<string, string> = { BJ: "229", BF: "226", CI: "225", SN: "221", TG: "228" };
const LOCAL_LEN: Record<string, number> = { BJ: 10, BF: 8, CI: 10, SN: 9, TG: 8 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Connecte-toi d'abord" }, 401);

    const { collaborationId, provider, phone, country } = await req.json().catch(() => ({}));
    const { data: c } = await admin.from("collaborations").select("id, brand_id, creator_id, agreed_amount, status, paid").eq("id", String(collaborationId ?? "")).maybeSingle();
    if (!c || c.brand_id !== user.id) return json({ error: "Collaboration introuvable" }, 404);
    if (c.paid) return json({ error: "Cette collaboration est déjà payée" }, 409);
    if (!["pending_payment", "content_submitted"].includes(c.status)) return json({ error: "Paiement impossible à cette étape" }, 409);

    const iso = String(country ?? "").toUpperCase();
    const mode = MODES[String(provider ?? "").toLowerCase()]?.[iso];
    if (!mode) return json({ error: "Cet opérateur n'est pas disponible dans ce pays" }, 400);
    let digits = String(phone ?? "").replace(/\D/g, "");
    if (digits.startsWith(DIAL[iso]) && digits.length > LOCAL_LEN[iso]) digits = digits.slice(DIAL[iso].length);
    if (digits.length !== LOCAL_LEN[iso]) return json({ error: `Le numéro doit contenir ${LOCAL_LEN[iso]} chiffres` }, 400);

    const { data: profile } = await admin.from("profiles").select("full_name, company_name").eq("user_id", user.id).maybeSingle();
    const name = (profile?.company_name || profile?.full_name || "Marque Collab Créa").trim();
    const [firstname, ...rest] = name.split(/\s+/);
    const total = brandTotal(Number(c.agreed_amount));
    const headers = fedapayHeaders();
    const phoneNumber = { number: `+${DIAL[iso]}${digits}`, country: iso.toLowerCase() };

    // 1) Transaction FedaPay
    const txRes = await fetch(`${fedapayBase()}/transactions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        description: `Collab Créa — collaboration ${c.id.slice(0, 8)}`,
        amount: total,
        currency: { iso: "XOF" },
        callback_url: "https://collabcrea.com/paiement",
        customer: { firstname: firstname || "Marque", lastname: rest.join(" ") || "Collab Créa", email: user.email, phone_number: phoneNumber },
        custom_metadata: { collaboration_id: c.id, brand_id: c.brand_id, creator_id: c.creator_id, agreed_amount: c.agreed_amount },
      }),
    });
    const txBody = await safeJson(txRes);
    const txId = txBody?.["v1/transaction"]?.id;
    if (!txRes.ok || !txId) {
      console.error("[FEDAPAY-PAYMENT] création", txRes.status, JSON.stringify(txBody));
      return json({ error: txBody?.message || "FedaPay a refusé la création du paiement" }, 502);
    }

    // 2) Jeton de paiement (contient aussi l'URL de la page de paiement)
    const tokRes = await fetch(`${fedapayBase()}/transactions/${txId}/token`, { method: "POST", headers });
    const tok = await safeJson(tokRes);
    if (!tokRes.ok || !tok?.token) {
      console.error("[FEDAPAY-PAYMENT] jeton", tokRes.status, JSON.stringify(tok));
      return json({ error: tok?.message || "Impossible d'ouvrir le paiement" }, 502);
    }

    // 3) Envoi direct sur le téléphone quand l'opérateur le permet
    if (DIRECT.has(mode)) {
      const pushRes = await fetch(`${fedapayBase()}/transactions/${mode}`, { method: "POST", headers, body: JSON.stringify({ token: tok.token, phone_number: phoneNumber }) });
      const push = await safeJson(pushRes);
      if (pushRes.ok) return json({ transactionId: String(txId), paymentUrl: push?.url ?? null, pushSent: !push?.url, total });
      console.error("[FEDAPAY-PAYMENT] envoi direct", mode, pushRes.status, JSON.stringify(push));
    }

    // 4) Sinon (Wave, ou échec de l'envoi direct) : page de paiement FedaPay
    return json({ transactionId: String(txId), paymentUrl: tok.url ?? null, pushSent: false, total });
  } catch (e) {
    console.error("[FEDAPAY-PAYMENT]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur de paiement" }, 500);
  }
});
