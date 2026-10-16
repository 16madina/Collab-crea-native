// Contrôles automatiques de la pièce d'identité, faits sur le téléphone (gratuits, rien n'est envoyé
// à un service extérieur) : lecture du texte (Apple Vision / Google ML Kit), bande MRZ et ses chiffres
// de contrôle, date d'expiration, nom comparé au profil, visage présent sur la pièce.
// Ils aident l'admin à décider ; ils ne remplacent pas sa validation.
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { createImageFaceDetector } from "react-native-vision-camera-face-detector";
import type { Picked } from "../../backend/upload";
import { findMrz, mrzDate, nameWords } from "../../mrz";
import type { IdentityChecks } from "../../types";

export async function checkDocument(photos: Picked[], fullName: string, docKey: string): Promise<IdentityChecks> {
  const res: IdentityChecks = { doc_type: docKey, available: true, checked_at: new Date().toISOString() };

  // 1. Texte lu sur chaque face.
  const lines: string[] = [];
  if (isSupported)
    for (const p of photos) {
      try {
        lines.push(...(await extractTextFromImage(p.uri)));
      } catch {
        /* photo illisible : on continue avec l'autre face */
      }
    }
  res.text_found = lines.join(" ").replace(/\s/g, "").length >= 20;

  // 2. Bande MRZ (passeport, dos des cartes récentes) : chiffres de contrôle, expiration, nom.
  const mrz = findMrz(lines);
  res.mrz_found = !!mrz;
  if (mrz) {
    res.mrz_checks = `${mrz.checksPassed}/${mrz.checksTotal}`;
    res.mrz_valid = mrz.checksOk;
    res.doc_number = mrz.docNumber;
    res.country = mrz.country;
    res.doc_name = [mrz.givenNames, mrz.surname].filter(Boolean).join(" ");
    const exp = mrzDate(mrz.expiry);
    if (exp) {
      res.expiry = exp.toISOString().slice(0, 10);
      res.expired = exp.getTime() < Date.now();
    }
  }

  // 3. Le nom du profil apparaît-il sur la pièce (bande MRZ ou texte imprimé) ?
  const mine = nameWords(fullName);
  const onDoc = new Set(nameWords(mrz ? `${mrz.surname} ${mrz.givenNames}` : lines.join(" ")));
  if (mine.length) res.name_match = mine.filter((w) => onDoc.has(w)).length >= Math.min(2, mine.length);

  // 4. Un visage (la photo d'identité) est-il présent sur la pièce ?
  try {
    const detector = createImageFaceDetector({ performanceMode: "accurate", minFaceSize: 0.05 });
    res.face_on_doc = photos.some((p) => detector.detectFaces({ uri: p.uri }).length > 0);
  } catch {
    res.face_on_doc = undefined;
  }
  return res;
}
