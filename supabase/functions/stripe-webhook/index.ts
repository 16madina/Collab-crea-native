// Webhook Stripe : Stripe prévient le serveur quand une session de paiement est terminée.
// URL à déclarer dans Stripe > Développeurs > Webhooks : https://qsbkwdtchhzclpxjrhnt.supabase.co/functions/v1/stripe-webhook
// Événements : checkout.session.completed, checkout.session.async_payment_succeeded.
// La signature (en-tête Stripe-Signature) est vérifiée avec STRIPE_WEBHOOK_SECRET, puis la session est relue chez Stripe.
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/fedapay.ts";
import { finalizeStripeSession, stripeClient } from "../_shared/stripe.ts";

const EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET non configuré");
    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get("Stripe-Signature") ?? "", secret, undefined, crypto);
    } catch {
      return json({ error: "Signature invalide" }, 400);
    }
    if (!EVENTS.has(event.type)) return json({ received: true, ignored: event.type });

    const sessionId = (event.data.object as { id?: string }).id ?? "";
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await finalizeStripeSession(admin, session);
    console.log("[STRIPE-WEBHOOK]", event.type, sessionId, JSON.stringify(result));
    return json({ received: true });
  } catch (e) {
    console.error("[STRIPE-WEBHOOK]", e);
    return json({ error: "Traitement du webhook impossible" }, 500);
  }
});
