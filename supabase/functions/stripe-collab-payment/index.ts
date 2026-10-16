// Paiement en séquestre d'une collaboration par carte bancaire (Stripe Checkout, en euros ou en dollars).
// Crée une session Stripe et renvoie l'URL de la page de paiement Stripe. Le paiement est confirmé ensuite par
// stripe-collab-verify (l'app vérifie) et stripe-webhook (Stripe prévient le serveur).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, json } from "../_shared/fedapay.ts";
import { cardAmountCents, type CardCurrency, RATES, stripeClient } from "../_shared/stripe.ts";

const RETURN_URL = "https://collabcrea.com/paiement";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Connecte-toi d'abord" }, 401);

    const { collaborationId, currency: rawCurrency } = await req.json().catch(() => ({}));
    const currency = String(rawCurrency ?? "eur").toLowerCase() as CardCurrency;
    if (!(currency in RATES)) return json({ error: "Devise non prise en charge" }, 400);
    const { data: c } = await admin.from("collaborations").select("id, brand_id, creator_id, offer_id, agreed_amount, status, paid").eq("id", String(collaborationId ?? "")).maybeSingle();
    if (!c || c.brand_id !== user.id) return json({ error: "Collaboration introuvable" }, 404);
    if (c.paid) return json({ error: "Cette collaboration est déjà payée" }, 409);
    if (!["pending_payment", "content_submitted"].includes(c.status)) return json({ error: "Paiement impossible à cette étape" }, 409);

    const [{ data: offer }, { data: creator }] = await Promise.all([
      admin.from("offers").select("title").eq("id", c.offer_id).maybeSingle(),
      admin.from("profiles").select("full_name").eq("user_id", c.creator_id).maybeSingle(),
    ]);
    const agreed = Number(c.agreed_amount);
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency,
          unit_amount: cardAmountCents(agreed, currency),
          product_data: {
            name: offer?.title || "Collaboration Collab Créa",
            description: `Créateur : ${creator?.full_name || "Créateur"} • ${agreed.toLocaleString("fr-FR")} FCFA + frais`,
          },
        },
      }],
      metadata: { collaboration_id: c.id, brand_id: c.brand_id, creator_id: c.creator_id, agreed_amount: String(agreed) },
      success_url: `${RETURN_URL}?statut=ok`,
      cancel_url: `${RETURN_URL}?statut=annule`,
    });
    if (!session.url) return json({ error: "Stripe n'a pas renvoyé de page de paiement" }, 502);
    return json({ transactionId: session.id, paymentUrl: session.url, pushSent: false, total: session.amount_total, gateway: "stripe" });
  } catch (e) {
    console.error("[STRIPE-PAYMENT]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur de paiement" }, 500);
  }
});
