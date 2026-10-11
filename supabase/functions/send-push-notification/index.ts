// Envoi des notifications push (appelé par les déclencheurs SQL via send_push_notification, ou par un admin).
// - Jetons Expo (« ExponentPushToken[...] », app native) → service push d'Expo (qui relaie vers APNs / FCM
//   avec la clé APNs et le compte Firebase enregistrés dans EAS).
// - Autres jetons (anciennes apps Capacitor) → FCM HTTP v1 avec FIREBASE_SERVICE_ACCOUNT (comme la version web).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Payload = { user_id?: string; user_ids?: string[]; title: string; body: string; data?: Record<string, unknown>; send_to_all?: boolean };
type ServiceAccount = { project_id: string; private_key: string; client_email: string };

const b64url = (s: string) => btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function googleAccessToken(sa: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: sa.client_email, sub: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/firebase.messaging" }),
  )}`;
  const pem = sa.private_key.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\n/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const jwt = `${input}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Google token: ${d.error_description || d.error}`);
  return d.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, serviceKey);

    // Autorisé : clé service (déclencheurs SQL) ou administrateur connecté.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    if (token !== serviceKey) {
      const { data: { user } } = await sb.auth.getUser(token);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { data: admin } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!admin) return json({ error: "Admin access required" }, 403);
    }

    const { user_id, user_ids, title, body, data = {}, send_to_all }: Payload = await req.json();
    if (!title || !body) return json({ error: "title and body are required" }, 400);

    let q = sb.from("push_tokens").select("id, token, user_id");
    if (!send_to_all) {
      if (user_ids?.length) q = q.in("user_id", user_ids);
      else if (user_id) q = q.eq("user_id", user_id);
      else return json({ error: "user_id, user_ids, or send_to_all is required" }, 400);
    }
    const { data: tokens, error } = await q;
    if (error) throw error;
    if (!tokens?.length) return json({ success: true, sent: 0, message: "No tokens found" });

    const strData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
    const expo = tokens.filter((t) => t.token.startsWith("ExponentPushToken") || t.token.startsWith("ExpoPushToken"));
    const fcm = tokens.filter((t) => !expo.includes(t));
    let sent = 0;
    const invalid: string[] = [];

    // 1) Expo (par lots de 100)
    for (let i = 0; i < expo.length; i += 100) {
      const batch = expo.slice(i, i + 100);
      const r = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch.map((t) => ({ to: t.token, title, body, data, sound: "default", priority: "high" }))),
      });
      const res = await r.json();
      (res.data ?? []).forEach((tk: { status: string; details?: { error?: string } }, j: number) => {
        if (tk.status === "ok") sent++;
        else if (tk.details?.error === "DeviceNotRegistered") invalid.push(batch[j].id);
      });
    }

    // 2) FCM HTTP v1 (jetons Firebase natifs)
    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (fcm.length && saJson) {
      const sa: ServiceAccount = JSON.parse(saJson);
      const access = await googleAccessToken(sa);
      await Promise.all(
        fcm.map(async (t) => {
          const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: { token: t.token, notification: { title, body }, data: strData, android: { notification: { sound: "default" } }, apns: { payload: { aps: { sound: "default" } } } },
            }),
          });
          if (r.ok) sent++;
          else if (r.status === 404) invalid.push(t.id);
        }),
      );
    }

    // Jetons qui ne sont plus valides (app désinstallée) : supprimés.
    if (invalid.length) await sb.from("push_tokens").delete().in("id", invalid);
    return json({ success: true, sent, total: tokens.length, removed: invalid.length });
  } catch (e) {
    console.error("push error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
