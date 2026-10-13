// Images embarquées dans l'app, référencées en base sous la forme « asset:dossier/nom »
// (utilisé par les comptes et annonces de démonstration).
export const ASSETS: Record<string, number> = {
  "creators/c0": require("../assets/creators/c0.jpg"),
  "creators/c1": require("../assets/creators/c1.jpg"),
  "creators/c2": require("../assets/creators/c2.jpg"),
  "creators/c3": require("../assets/creators/c3.jpg"),
  "creators/c4": require("../assets/creators/c4.jpg"),
  "creators/c5": require("../assets/creators/c5.jpg"),
  "creators/c6": require("../assets/creators/c6.jpg"),
  "creators/c7": require("../assets/creators/c7.jpg"),
  "creators/c8": require("../assets/creators/c8.jpg"),
  "profile/cover": require("../assets/profile/cover.jpg"),
  "profile/p0": require("../assets/profile/p0.jpg"),
  "profile/p1": require("../assets/profile/p1.jpg"),
  "profile/p2": require("../assets/profile/p2.jpg"),
  "profile/p3": require("../assets/profile/p3.jpg"),
  "profile/p4": require("../assets/profile/p4.jpg"),
  "profile/p5": require("../assets/profile/p5.jpg"),
  "brand/cover": require("../assets/brand/cover.jpg"),
  "brand/hero": require("../assets/brand/hero.jpg"),
  "brand/c1": require("../assets/brand/c1.jpg"),
  "offers/o1": require("../assets/offers/o1.jpg"),
  "offers/o2": require("../assets/offers/o2.jpg"),
  "offers/o3": require("../assets/offers/o3.jpg"),
  "offers/o4": require("../assets/offers/o4.jpg"),
  "brand/c2": require("../assets/brand/c2.jpg"),
  "brand/c3": require("../assets/brand/c3.jpg"),
};

/** « asset:… » → image embarquée ; sinon la valeur telle quelle. */
export const img = <T>(v: T): T | number => (typeof v === "string" && v.startsWith("asset:") ? (ASSETS[v.slice(6)] ?? v) : v);

/** Image embarquée → « asset:… » (pour l'enregistrer en base). */
export const assetKey = (n: number) => {
  const k = Object.keys(ASSETS).find((key) => ASSETS[key] === n);
  return k ? `asset:${k}` : null;
};
