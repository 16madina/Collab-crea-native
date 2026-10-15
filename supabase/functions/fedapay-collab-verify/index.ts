// Vérifie auprès de FedaPay si le paiement d'une collaboration est fait (appelée par l'app de la marque
// pendant l'attente) et, si oui, passe la collaboration en séquestre payé.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, fetchTransaction, finalizePayment, json } from "../_shared/fedapay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Connecte-toi d'abord" }, 401);

    const { transactionId, collaborationId } = await req.json().catch(() => ({}));
    if (!/^\d+$/.test(String(transactionId ?? ""))) return json({ error: "Transaction invalide" }, 400);
    const { data: c } = await admin.from("collaborations").select("brand_id").eq("id", String(collaborationId ?? "")).maybeSingle();
    if (!c || c.brand_id !== user.id) return json({ error: "Accès refusé" }, 403);

    const tx = await fetchTransaction(String(transactionId));
    return json(await finalizePayment(admin, tx, String(collaborationId)));
  } catch (e) {
    console.error("[FEDAPAY-VERIFY]", e);
    return json({ error: e instanceof Error ? e.message : "Vérification impossible" }, 500);
  }
});
