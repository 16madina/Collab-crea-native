// Vérification d'un réseau social par capture d'écran (reprend la logique de l'ancienne app).
// L'IA (Claude) lit la capture, compare au nom de page / abonnés déclarés et au nom légal,
// puis : vérifié (confiance ≥ 70 et tout concorde), sinon envoi à l'admin (≥ 40) ou rejet.
// Sans clé ANTHROPIC_API_KEY ou en cas d'erreur IA : envoi à l'admin.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["extracted_name", "extracted_followers", "name_matches", "followers_match", "is_correct_platform", "identity_consistent", "confidence", "reason"],
  properties: {
    extracted_name: { type: "string", description: "Nom / @handle visible sur la capture" },
    extracted_followers: { type: "string", description: "Abonnés tels qu'affichés (ex. 50K, 1.2M, 793 027)" },
    name_matches: { type: "boolean" },
    followers_match: { type: "boolean" },
    is_correct_platform: { type: "boolean" },
    identity_consistent: { type: "boolean" },
    confidence: { type: "integer", description: "0 à 100" },
    reason: { type: "string", description: "Explication courte en français" },
  },
};
type Verdict = { extracted_name: string; extracted_followers: string; name_matches: boolean; followers_match: boolean; is_correct_platform: boolean; identity_consistent: boolean; confidence: number; reason: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { verification_id } = await req.json();
    const { data: v } = await sb.from("social_verifications").select("*").eq("id", verification_id).maybeSingle();
    if (!v) return json({ error: "Introuvable" }, 404);
    const { data: isAdmin } = await sb.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (v.user_id !== user.id && !isAdmin) return json({ error: "Forbidden" }, 403);

    const { data: prof } = await sb.from("profiles").select("full_name, identity_verified").eq("user_id", v.user_id).maybeSingle();
    const save = async (patch: Record<string, unknown>) => {
      const { data } = await sb.from("social_verifications").update(patch).eq("id", v.id).select("*").single();
      return json({ verification: data });
    };
    if (!prof?.identity_verified)
      return save({ status: "rejected", ai_reason: "Identité non vérifiée — vérifiez votre identité avant de lier un réseau social." });

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return save({ status: "pending_admin", ai_reason: "Analyse automatique indisponible — vérification par un administrateur." });

    // Capture (bucket privé) → base64
    const { data: file, error: dlErr } = await sb.storage.from("social-screenshots").download(String(v.screenshot_url).replace(/^storage:\/\//, ""));
    if (dlErr || !file) return save({ status: "pending_admin", ai_reason: "Capture illisible — vérification par un administrateur." });
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const mt = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const prompt = `Tu vérifies une capture d'écran d'un profil ${v.platform}.
Déclaration de l'utilisateur : nom de page « ${v.page_name} », abonnés « ${v.claimed_followers} ». Nom légal vérifié : « ${prof.full_name} ».
1. Lis le nom / @handle et le nombre d'abonnés tels qu'affichés.
2. name_matches : le nom correspond-il à la déclaration (ex. « @dina » ≈ « Dina ») ?
3. followers_match : les abonnés correspondent-ils, arrondis compris (« 49,8K » ≈ « 50K ») ?
4. is_correct_platform : la capture est-elle bien ${v.platform} ?
5. CRITIQUE — identity_consistent : ce compte peut-il plausiblement appartenir à « ${prof.full_name} » ? Un compte de célébrité sans rapport = false. En cas de doute, false (un administrateur vérifiera).
6. confidence : ta confiance globale de 0 à 100. reason : une phrase en français.`;

    let r: Verdict | null = null;
    try {
      const client = new Anthropic({ apiKey: key });
      const msg = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mt, data: btoa(bin) } }, { type: "text", text: prompt }] }],
      } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
      const text = msg.stop_reason === "refusal" ? null : msg.content.find((b) => b.type === "text")?.text;
      if (text) r = JSON.parse(text) as Verdict;
    } catch (e) {
      console.error("analyse IA", e);
    }
    if (!r) return save({ status: "pending_admin", ai_reason: "Analyse automatique non concluante — vérification par un administrateur." });

    const confidence = Math.max(0, Math.min(100, Math.round(r.confidence)));
    const technical = r.name_matches && r.followers_match && r.is_correct_platform && confidence >= 70;
    const verified = technical && r.identity_consistent === true;
    const status = verified ? "verified" : technical || confidence >= 40 ? "pending_admin" : "rejected";
    if (verified) await sb.from("profiles").update({ [`${v.platform}_followers`]: r.extracted_followers }).eq("user_id", v.user_id);
    return save({ status, ai_confidence: confidence, ai_extracted_name: r.extracted_name, ai_extracted_followers: r.extracted_followers, ai_reason: r.reason });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
