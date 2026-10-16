// Présentation des contrôles automatiques de la pièce (pour la personne et pour l'admin).
import type { IdentityChecks } from "../../types";

export type CheckRow = { label: string; ok: boolean | null; detail?: string };

const frDate = (iso: string) => iso.split("-").reverse().join("/");

export function checkRows(c: IdentityChecks): CheckRow[] {
  const passport = c.doc_type === "passeport";
  const rows: CheckRow[] = [
    { label: "Visage présent sur la pièce", ok: c.face_on_doc ?? null },
    { label: "Texte de la pièce lisible", ok: c.text_found ?? null },
    {
      label: "Bande de sécurité (MRZ) lue",
      // Passeport : toujours présente. Autres pièces : seulement sur les modèles récents.
      ok: c.mrz_found ? true : passport ? false : null,
      detail: c.mrz_found ? undefined : passport ? "Introuvable : photographiez toute la page" : "Non trouvée sur ce document",
    },
  ];
  if (c.mrz_found) rows.push({ label: "Chiffres de sécurité valides", ok: c.mrz_valid ?? null, detail: c.mrz_checks });
  if (c.expiry) rows.push({ label: "Pièce en cours de validité", ok: !c.expired, detail: `${c.expired ? "Expirée le" : "Expire le"} ${frDate(c.expiry)}` });
  rows.push({ label: "Nom identique au profil", ok: c.name_match ?? null, detail: c.doc_name });
  return rows;
}

/** « ok » : tout est bon ; « fail » : pièce expirée ; « warn » : un contrôle n'a pas abouti. */
export function checkVerdict(c: IdentityChecks): "ok" | "warn" | "fail" {
  if (c.expired) return "fail";
  return checkRows(c).every((r) => r.ok !== false) && c.face_on_doc && c.name_match ? "ok" : "warn";
}
