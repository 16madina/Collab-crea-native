// Outils communs Stripe (paiement par carte bancaire des collaborations, via Stripe Checkout).
// Secrets à définir dans Supabase > Edge Functions > Secrets :
//   STRIPE_SECRET_KEY      clé secrète (sk_live_…) — tableau de bord Stripe > Développeurs > Clés API
//   STRIPE_WEBHOOK_SECRET  secret de signature du webhook (whsec_…) — Stripe > Développeurs > Webhooks
// La carte est facturée en euros ou en dollars : montant FCFA (+10 % de frais de service, +5 % de frais
// bancaires) converti au taux fixe — identique à l'affichage de l'app (computeCommission + RATES).
import Stripe from "npm:stripe@17.7.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const RATES = { eur: 655.957, usd: 600 } as const;
export type CardCurrency = keyof typeof RATES;

export const stripeClient = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Paiement par carte indisponible : clé Stripe non configurée");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
};

/** Total carte en FCFA payé par la marque (même calcul que confirm_collab_payment avec p_method = 'card'). */
export const cardTotalFcfa = (agreed: number) => {
  const total = agreed + Math.round(agreed * 0.1);
  return total + Math.round(total * 0.05);
};

/** Montant Stripe en centimes pour une devise (minimum Stripe : 0,50). */
export const cardAmountCents = (agreed: number, currency: CardCurrency) => Math.max(50, Math.round((cardTotalFcfa(agreed) / RATES[currency]) * 100));

/**
 * Si la session Stripe est payée, contrôle la collaboration, le montant et la devise
 * puis passe la collaboration en séquestre payé (confirm_collab_payment, réservée au serveur).
 */
export async function finalizeStripeSession(admin: SupabaseClient, session: Stripe.Checkout.Session, expectedCollab?: string) {
  if (session.payment_status !== "paid") return { paid: false, status: session.status === "expired" ? "expired" : "pending" };
  const meta = session.metadata ?? {};
  const collabId = String(meta.collaboration_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(collabId)) throw new Error("Session sans collaboration");
  if (expectedCollab && collabId !== expectedCollab) throw new Error("Cette session concerne une autre collaboration");

  const { data: c, error } = await admin.from("collaborations").select("id, brand_id, creator_id, agreed_amount").eq("id", collabId).single();
  if (error || !c) throw new Error("Collaboration introuvable");
  if (meta.brand_id !== c.brand_id || meta.creator_id !== c.creator_id) throw new Error("Session incohérente avec la collaboration");
  const currency = String(session.currency ?? "").toLowerCase() as CardCurrency;
  if (!(currency in RATES)) throw new Error("Devise non prise en charge");
  const agreed = Number(c.agreed_amount);
  if (session.amount_total !== cardAmountCents(agreed, currency)) throw new Error(`Montant payé incorrect (${session.amount_total} ${currency})`);

  const { data: result, error: rpcError } = await admin.rpc("confirm_collab_payment", {
    p_collab: collabId,
    p_reference: `stripe-${session.id}`,
    p_gateway_amount: cardTotalFcfa(agreed),
    p_method: "card",
  });
  if (rpcError) throw new Error(rpcError.message);
  return { paid: true, status: "approved", result, collaborationId: collabId };
}
