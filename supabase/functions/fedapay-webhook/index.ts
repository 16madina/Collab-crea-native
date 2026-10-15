// Webhook FedaPay : FedaPay prévient le serveur quand une transaction change d'état.
// URL à déclarer dans FedaPay > Webhooks : https://qsbkwdtchhzclpxjrhnt.supabase.co/functions/v1/fedapay-webhook
// La signature (en-tête X-FEDAPAY-SIGNATURE) est vérifiée avec FEDAPAY_WEBHOOK_SECRET,
// puis la transaction est relue chez FedaPay avant toute confirmation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors, fetchTransaction, finalizePayment, json } from "../_shared/fedapay.ts";

const EVENTS = new Set(["transaction.approved", "transaction.transferred", "transaction.updated"]);

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

async function validSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "s").map(([, v]) => v);
  if (!Number.isFinite(t) || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  return sigs.some((s) => sameText(s, expected));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  try {
    const secret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET");
    if (!secret) throw new Error("FEDAPAY_WEBHOOK_SECRET non configuré");
    const raw = await req.text();
    if (!(await validSignature(raw, req.headers.get("X-FEDAPAY-SIGNATURE"), secret))) return json({ error: "Signature invalide" }, 401);

    const event = JSON.parse(raw);
    const name = String(event?.name ?? event?.type ?? "");
    if (!EVENTS.has(name)) return json({ received: true, ignored: name });
    const entity = event?.entity ?? event?.object ?? event?.data;
    const txId = String(entity?.id ?? entity?.object?.id ?? "");
    if (!/^\d+$/.test(txId)) return json({ error: "Transaction absente" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const result = await finalizePayment(admin, await fetchTransaction(txId));
    console.log("[FEDAPAY-WEBHOOK]", name, txId, JSON.stringify(result));
    return json({ received: true });
  } catch (e) {
    console.error("[FEDAPAY-WEBHOOK]", e);
    return json({ error: "Traitement du webhook impossible" }, 500);
  }
});
