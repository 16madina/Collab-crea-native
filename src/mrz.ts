// Lecture de la bande « MRZ » des pièces d'identité (les 2 ou 3 lignes avec des « < » en bas des
// passeports et au dos des cartes) à partir du texte lu sur la photo, et contrôle de ses chiffres de
// sécurité (norme OACI 9303 : passeports TD3, cartes TD1 et TD2). Tolère les erreurs de lecture courantes.

export type Mrz = {
  format: "TD1" | "TD2" | "TD3";
  docType: string;
  country: string;
  docNumber: string;
  surname: string;
  givenNames: string;
  birth: string; // AAMMJJ
  expiry: string; // AAMMJJ
  checksOk: boolean; // tous les chiffres de contrôle sont bons
  checksPassed: number;
  checksTotal: number;
};

const LEN = { TD1: 30, TD2: 36, TD3: 44 } as const;

function charValue(c: string) {
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55;
  return 0; // « < »
}

/** Chiffre de contrôle OACI : poids 7, 3, 1 répétés, somme modulo 10. */
export function checkDigit(s: string) {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += charValue(s[i]) * w[i % 3];
  return String(sum % 10);
}

/** Corrige les confusions lettre / chiffre dans une zone qui ne contient que des chiffres. */
const digits = (s: string) => s.replace(/O|Q|D/g, "0").replace(/I|L/g, "1").replace(/Z/g, "2").replace(/S/g, "5").replace(/B/g, "8").replace(/G/g, "6");

/** Nettoie une ligne lue : majuscules, sans espaces, guillemets « pris pour des < ». */
function clean(line: string) {
  return line
    .toUpperCase()
    .replace(/«/g, "<<")
    .replace(/[‹〈＜]/g, "<")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

const fit = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + "<".repeat(n - s.length));

function names(s: string) {
  const [sur, ...rest] = s.replace(/<+$/, "").split("<<");
  return { surname: sur.replace(/</g, " ").trim(), givenNames: rest.join(" ").replace(/</g, " ").replace(/\s+/g, " ").trim() };
}

function verify(pairs: [string, string][]) {
  const passed = pairs.filter(([data, chk]) => checkDigit(data) === chk).length;
  return { checksPassed: passed, checksTotal: pairs.length, checksOk: passed === pairs.length };
}

function parseTD3(l1: string, l2: string): Mrz {
  l1 = fit(l1, 44);
  l2 = fit(l2, 44);
  const num = l2.slice(0, 9);
  const birth = digits(l2.slice(13, 19));
  const expiry = digits(l2.slice(21, 27));
  const c = (i: number) => digits(l2[i]);
  const opt = l2.slice(28, 42);
  const composite = num + c(9) + birth + c(19) + expiry + c(27) + opt + c(42);
  return {
    format: "TD3",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l1.slice(5)),
    birth,
    expiry,
    ...verify([
      [num, c(9)],
      [birth, c(19)],
      [expiry, c(27)],
      [composite, c(43)],
    ]),
  };
}

function parseTD1(l1: string, l2: string, l3: string): Mrz {
  l1 = fit(l1, 30);
  l2 = fit(l2, 30);
  l3 = fit(l3, 30);
  const num = l1.slice(5, 14);
  const birth = digits(l2.slice(0, 6));
  const expiry = digits(l2.slice(8, 14));
  const composite = l1.slice(5, 30) + birth + digits(l2[6]) + expiry + digits(l2[14]) + l2.slice(18, 29);
  return {
    format: "TD1",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l3),
    birth,
    expiry,
    ...verify([
      [num, digits(l1[14])],
      [birth, digits(l2[6])],
      [expiry, digits(l2[14])],
      [composite, digits(l2[29])],
    ]),
  };
}

function parseTD2(l1: string, l2: string): Mrz {
  l1 = fit(l1, 36);
  l2 = fit(l2, 36);
  const num = l2.slice(0, 9);
  const birth = digits(l2.slice(13, 19));
  const expiry = digits(l2.slice(21, 27));
  const c = (i: number) => digits(l2[i]);
  const composite = num + c(9) + birth + c(19) + expiry + c(27) + l2.slice(28, 35);
  return {
    format: "TD2",
    docType: l1.slice(0, 2).replace(/</g, ""),
    country: l1.slice(2, 5).replace(/</g, ""),
    docNumber: num.replace(/</g, ""),
    ...names(l1.slice(5)),
    birth,
    expiry,
    ...verify([
      [num, c(9)],
      [birth, c(19)],
      [expiry, c(27)],
      [composite, c(35)],
    ]),
  };
}

/** Cherche une bande MRZ dans les lignes de texte lues sur une ou plusieurs photos. */
export function findMrz(lines: string[]): Mrz | null {
  // Lignes candidates : assez longues et contenant des « < ».
  const cand = lines
    .flatMap((l) => l.split(/\n/))
    .map(clean)
    .filter((l) => l.length >= 26 && l.includes("<"));
  const best: Mrz[] = [];
  for (let i = 0; i < cand.length; i++) {
    const a = cand[i];
    const b = cand[i + 1];
    const c = cand[i + 2];
    if (b && a.length >= 40 && b.length >= 40 && /^[PV]/.test(a)) best.push(parseTD3(a, b));
    if (b && c && a.length <= 33 && b.length <= 33 && c.length <= 33 && /^[ACI]/.test(a)) best.push(parseTD1(a, b, c));
    if (b && a.length > 33 && a.length < 40 && /^[ACIPV]/.test(a)) best.push(parseTD2(a, b));
  }
  if (!best.length) return null;
  // Garde la lecture la plus cohérente (le plus de chiffres de contrôle justes).
  return best.sort((x, y) => y.checksPassed - x.checksPassed)[0];
}

/** Date AAMMJJ d'expiration → Date (les années 00–79 sont 2000–2079). */
export function mrzDate(yymmdd: string, future = true): Date | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const year = future ? 2000 + yy : yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy;
  const d = new Date(Date.UTC(year, Number(yymmdd.slice(2, 4)) - 1, Number(yymmdd.slice(4, 6))));
  return isNaN(d.getTime()) ? null : d;
}

/** Mots du nom, en majuscules sans accents (pour comparer pièce et profil). */
export function nameWords(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((w) => w.length >= 2);
}

export const MRZ_LEN = LEN;
