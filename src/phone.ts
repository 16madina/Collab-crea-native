// Vérification des numéros de téléphone selon le pays (règles de Google : nombre de chiffres et préfixes
// valides pour chaque pays), avec un message clair et un exemple de numéro valide.
import { getExampleNumber, isSupportedCountry, isValidPhoneNumber, parsePhoneNumberFromString, validatePhoneNumberLength, type CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

/** Exemple de numéro mobile au format du pays (ex. « 07 01 23 45 67 »), ou undefined. */
export function phoneExample(countryCode?: string): string | undefined {
  if (!countryCode || !isSupportedCountry(countryCode)) return undefined;
  return getExampleNumber(countryCode as CountryCode, examples)?.formatNational();
}

/**
 * Vérifie que le numéro (chiffres saisis, sans indicatif) correspond au pays.
 * Renvoie un message d'erreur en français, ou null si le numéro est valide.
 */
export function phoneError(digits: string, countryCode: string | undefined, countryName: string | undefined): string | null {
  const n = digits.replace(/\D/g, "");
  if (!n) return "Entrez votre numéro de téléphone";
  if (!countryCode) return "Choisissez d'abord votre pays de résidence";
  if (!isSupportedCountry(countryCode)) return /^\d{6,15}$/.test(n) ? null : "Numéro invalide (6 à 15 chiffres)";
  const code = countryCode as CountryCode;
  if (isValidPhoneNumber(n, code)) return null;
  const ex = phoneExample(code);
  const pays = countryName ? ` (${countryName})` : "";
  const exemple = ex ? ` Exemple : ${ex}` : "";
  const length = validatePhoneNumberLength(n, code);
  if (length === "TOO_SHORT") return `Numéro trop court${pays}.${exemple}`;
  if (length === "TOO_LONG") return `Numéro trop long${pays}.${exemple}`;
  return `Ce numéro ne correspond pas au pays choisi${pays}.${exemple}`;
}

/** Numéro au format international (+2250701234567), ou undefined s'il n'est pas valide. */
export function phoneE164(digits: string, countryCode?: string): string | undefined {
  if (!countryCode || !isSupportedCountry(countryCode)) return undefined;
  const p = parsePhoneNumberFromString(digits.replace(/\D/g, ""), countryCode as CountryCode);
  return p?.isValid() ? p.number : undefined;
}
