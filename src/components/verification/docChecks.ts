// Contrôles automatiques de la pièce d'identité : sur le web (aperçu), ils ne sont pas disponibles
// (pas de lecture de texte ni de détection de visage dans le navigateur). Voir docChecks.native.ts.
import type { Picked } from "../../backend/upload";
import type { IdentityChecks } from "../../types";

export async function checkDocument(_photos: Picked[], _fullName: string, docKey: string): Promise<IdentityChecks> {
  return { doc_type: docKey, available: false, checked_at: new Date().toISOString() };
}
