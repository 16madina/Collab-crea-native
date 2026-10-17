// Vérification automatique d'identité, côté serveur (personne ne peut tricher depuis l'app) :
// 1. Amazon Rekognition compare le visage du scan (face) avec la photo de la pièce → % de ressemblance.
// 2. Amazon Textract lit le texte de la pièce → bande MRZ (chiffres de contrôle), expiration, nom.
// 3. Décision : tout est bon (visage ≥ 90 %, nom identique, pièce valide) → identité validée automatiquement ;
//    sinon la demande reste dans Admin › Identités avec le rapport. Aucun refus automatique.
// Clés : AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (utilisateur IAM limité à Rekognition + Textract).
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findMrz, mrzDate, nameWords } from "../_shared/mrz.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Rekognition n'existe pas à Paris : Europe (Irlande).
const REGION = Deno.env.get("VERIFY_AWS_REGION") || "eu-west-1";
const FACE_MIN = 90; // % de ressemblance minimum pour valider automatiquement

type Report = {
  at: string;
  decision: "approved" | "review";
  reason: string;
  face_similarity: number | null;
  name_match: boolean | null;
  doc_name?: string;
  mrz_found: boolean;
  mrz_valid: boolean | null;
  mrz_checks?: string;
  doc_number?: string;
  country?: string;
  expiry?: string;
  expired: boolean | null;
  error?: string;
};

function b64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { selfie_url, document_url, doc_type } = (await req.json()) as { selfie_url?: string; document_url?: string; doc_type?: string };
    // Les fichiers doivent être dans le dossier de la personne elle-même.
    const own = (p?: string) => !!p && p.startsWith(`${user.id}/`) && !p.includes("..");
    if (!own(selfie_url) || !own(document_url)) return json({ error: "Fichiers invalides" }, 400);

    const { data: prof } = await sb.from("profiles").select("full_name, identity_verified").eq("user_id", user.id).maybeSingle();
    if (!prof) return json({ error: "Profil introuvable" }, 404);
    if (prof.identity_verified) return json({ decision: "approved", already: true });

    const save = async (report: Report) => {
      const patch: Record<string, unknown> = {
        identity_ai: report,
        identity_submitted_at: new Date().toISOString(),
        identity_method: "face_scan",
        selfie_url,
        identity_document_url: document_url,
      };
      if (report.decision === "approved") patch.identity_verified = true;
      await sb.from("profiles").update(patch).eq("user_id", user.id);
      if (report.decision === "approved")
        await sb.from("notifications").insert({ user_id: user.id, title: "Identité vérifiée ✅", message: "Votre identité a été vérifiée automatiquement.", type: "success" });
      return json({ decision: report.decision, report });
    };
    const review = (reason: string, extra: Partial<Report> = {}) =>
      save({ at: new Date().toISOString(), decision: "review", reason, face_similarity: null, name_match: null, mrz_found: false, mrz_valid: null, expired: null, ...extra });

    // Espaces / retours à la ligne retirés (souvent ajoutés en collant la clé).
    const keyId = Deno.env.get("AWS_ACCESS_KEY_ID")?.replace(/\s/g, "");
    const secret = Deno.env.get("AWS_SECRET_ACCESS_KEY")?.replace(/\s/g, "");
    if (!keyId || !secret) return review("Analyse automatique indisponible — vérification par un administrateur.");
    const aws = new AwsClient({ accessKeyId: keyId, secretAccessKey: secret, region: REGION });
    const call = async (service: "rekognition" | "textract", target: string, body: unknown) => {
      const r = await aws.fetch(`https://${service}.${REGION}.amazonaws.com/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": target },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(String(data.message || data.Message || data.__type || r.status)), { type: String(data.__type || "") });
      return data;
    };

    // Fichiers : la photo de face du scan + toutes les photos de la pièce (recto, verso).
    const folder = (p: string) => p.split("/").slice(0, -1).join("/");
    const download = async (bucket: string, path: string) => {
      const { data } = await sb.storage.from(bucket).download(path);
      return data ? new Uint8Array(await data.arrayBuffer()) : null;
    };
    const { data: selfieFiles } = await sb.storage.from("selfies").list(folder(selfie_url!));
    const facePath = selfieFiles?.find((f) => f.name.startsWith("face"))?.name;
    const face = await download("selfies", facePath ? `${folder(selfie_url!)}/${facePath}` : selfie_url!);
    const { data: docFiles } = await sb.storage.from("identity-documents").list(folder(document_url!));
    const docs: Uint8Array[] = [];
    for (const f of (docFiles ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      // « recto… » avant « verso… » (ordre alphabétique)
      const bytes = await download("identity-documents", `${folder(document_url!)}/${f.name}`);
      if (bytes) docs.push(bytes);
    }
    if (!face || !docs.length) return review("Photos introuvables — vérification par un administrateur.");

    // 1. Visage du scan comparé à la photo de la pièce (meilleur score sur recto / verso).
    let similarity: number | null = null;
    for (const d of docs) {
      try {
        const r = await call("rekognition", "RekognitionService.CompareFaces", { SourceImage: { Bytes: b64(face) }, TargetImage: { Bytes: b64(d) }, SimilarityThreshold: 0 });
        const best = Math.max(0, ...((r.FaceMatches ?? []) as { Similarity: number }[]).map((m) => m.Similarity));
        similarity = Math.max(similarity ?? 0, Math.round(best * 10) / 10);
      } catch (e) {
        // Pas de visage sur cette face de la pièce : on essaie l'autre.
        if (!String((e as { type?: string }).type).includes("InvalidParameter")) throw e;
      }
    }

    // 2. Texte de la pièce → MRZ, expiration, nom.
    const lines: string[] = [];
    for (const d of docs) {
      const r = await call("textract", "Textract.DetectDocumentText", { Document: { Bytes: b64(d) } });
      for (const b of (r.Blocks ?? []) as { BlockType: string; Text?: string }[]) if (b.BlockType === "LINE" && b.Text) lines.push(b.Text);
    }
    const mrz = findMrz(lines);
    const exp = mrz ? mrzDate(mrz.expiry) : null;
    const expired = exp ? exp.getTime() < Date.now() : null;
    const mine = nameWords(prof.full_name ?? "");
    const onDoc = new Set(nameWords(mrz ? `${mrz.surname} ${mrz.givenNames}` : lines.join(" ")));
    const nameMatch = mine.length ? mine.filter((w) => onDoc.has(w)).length >= Math.min(2, mine.length) : null;

    const report: Report = {
      at: new Date().toISOString(),
      decision: "review",
      reason: "",
      face_similarity: similarity,
      name_match: nameMatch,
      doc_name: mrz ? [mrz.givenNames, mrz.surname].filter(Boolean).join(" ") : undefined,
      mrz_found: !!mrz,
      mrz_valid: mrz ? mrz.checksOk : null,
      mrz_checks: mrz ? `${mrz.checksPassed}/${mrz.checksTotal}` : undefined,
      doc_number: mrz?.docNumber,
      country: mrz?.country,
      expiry: exp ? exp.toISOString().slice(0, 10) : undefined,
      expired,
    };

    // 3. Décision. Passeport : la bande MRZ valide est obligatoire ; autres pièces : si elle est lue, elle doit être valide.
    const problems: string[] = [];
    if (similarity === null) problems.push("aucun visage reconnu sur la pièce");
    else if (similarity < FACE_MIN) problems.push(`visage ressemblant à ${similarity} % (minimum ${FACE_MIN} %)`);
    if (nameMatch === false) problems.push("le nom de la pièce ne correspond pas au profil");
    if (nameMatch === null) problems.push("nom illisible");
    if (expired) problems.push("pièce expirée");
    if (mrz && !mrz.checksOk) problems.push(`chiffres de sécurité incorrects (${report.mrz_checks})`);
    if (!mrz && doc_type === "passeport") problems.push("bande MRZ du passeport illisible");
    if (problems.length) {
      report.reason = `À vérifier : ${problems.join(", ")}.`;
      return save(report);
    }
    report.decision = "approved";
    report.reason = `Validée automatiquement : visage ${similarity} %, nom identique${mrz ? `, MRZ ${report.mrz_checks}` : ""}${report.expiry ? `, valide jusqu'au ${report.expiry}` : ""}.`;
    return save(report);
  } catch (e) {
    // Erreur AWS ou autre : on n'empêche jamais la demande, elle part à l'admin.
    console.error("verify-identity", e);
    return json({ decision: "review", error: (e as Error).message });
  }
});
