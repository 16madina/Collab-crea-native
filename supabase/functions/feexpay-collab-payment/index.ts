// Paiement en séquestre d'une collaboration par Mobile Money via FeexPay (Orange, Wave en Côte d'Ivoire).
// Crée la demande de paiement et renvoie le lien de paiement de l'opérateur (Orange Money / Wave).
// Le paiement est confirmé ensuite par feexpay-collab-verify (l'app vérifie) et feexpay-webhook.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandTotal, cors, json } from "../_shared/fedapay.ts";
import { callbackInfo, FEEXPAY_API, feexpayConfig } from "../_shared/feexpay.ts";

// Opérateur + pays -> réseau FeexPay. Wave exige la « clé agrégée Wave » (FeexPay > Configuration).
const NETWORKS: Record<string, Record<string, string>> = {
  orange: { CI: "orange_ci" },
  wave: { CI: "wave_ci" },
};
const DIAL: Record<string, string> = { CI: "225" };
const LOCAL_LEN: Record<string, number> = { CI: 10 };
const RETURN_URL = "https://collabcrea.com/paiement";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Connecte-toi d'abord" }, 401);

    const { collaborationId, provider, phone, country } = await req.json().catch(() => ({}));
    const { data: c } = await admin.from("collaborations").select("id, brand_id, agreed_amount, status, paid").eq("id", String(collaborationId ?? "")).maybeSingle();
    if (!c || c.brand_id !== user.id) return json({ error: "Collaboration introuvable" }, 404);
    if (c.paid) return json({ error: "Cette collaboration est déjà payée" }, 409);
    if (!["pending_payment", "content_submitted"].includes(c.status)) return json({ error: "Paiement impossible à cette étape" }, 409);

    const iso = String(country ?? "").toUpperCase();
    const network = NETWORKS[String(provider ?? "").toLowerCase()]?.[iso];
    if (!network) return json({ error: "Cet opérateur n'est pas disponible dans ce pays" }, 400);
    let digits = String(phone ?? "").replace(/\D/g, "");
    if (digits.startsWith(DIAL[iso]) && digits.length > LOCAL_LEN[iso]) digits = digits.slice(DIAL[iso].length);
    if (digits.length !== LOCAL_LEN[iso]) return json({ error: `Le numéro doit contenir ${LOCAL_LEN[iso]} chiffres` }, 400);

    const { data: profile } = await admin.from("profiles").select("full_name, company_name").eq("user_id", user.id).maybeSingle();
    const name = (profile?.company_name || profile?.full_name || "Marque").normalize("NFD").replace(/[^\w\s-]/g, "").trim();
    const [firstName, ...rest] = name.split(/\s+/);
    const total = brandTotal(Number(c.agreed_amount));
    const { shop, headers } = feexpayConfig();

    const res = await fetch(`${FEEXPAY_API}/transactions/public/requesttopay/${network}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shop,
        amount: total,
        phoneNumber: Number(`${DIAL[iso]}${digits}`),
        first_name: firstName || "Marque",
        last_name: rest.join(" ") || "Collab Crea",
        description: "Collab Crea collaboration",
        callback_info: callbackInfo(c.id),
        return_url: RETURN_URL,
        cancel_url: RETURN_URL,
      }),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = text.trim() ? JSON.parse(text) : {};
    } catch {
      body = { message: text.slice(0, 200) };
    }
    const reference = String(body.reference ?? body.order_id ?? "");
    if (!res.ok || !reference) {
      console.error("[FEEXPAY-PAYMENT]", network, res.status, text.slice(0, 500));
      return json({ error: String(body.message || "FeexPay a refusé la création du paiement") }, 502);
    }
    const paymentUrl = typeof body.payment_url === "string" ? body.payment_url : null;
    return json({ transactionId: reference, paymentUrl, pushSent: !paymentUrl, total, gateway: "feexpay" });
  } catch (e) {
    console.error("[FEEXPAY-PAYMENT]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur de paiement" }, 500);
  }
});
