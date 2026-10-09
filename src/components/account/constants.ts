// Constantes et utilitaires partagés par les écrans compte / profil / auth.
import { Ionicons } from "@expo/vector-icons";
import { SocialPlatform } from "../../types";

const u = (id: string, w = 400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const SAMPLE_AVATARS = [
  u("photo-1531123897727-8f129e1688ce"),
  u("photo-1506794778202-cad84cf45f1d"),
  u("photo-1524504388940-b1c1722653e1"),
  u("photo-1531384441138-2736e62e0919"),
  u("photo-1589156280159-27698a70f29e"),
  u("photo-1507003211169-0a1dd7228f2d"),
];

export const SAMPLE_BANNERS = [
  u("photo-1515886657613-9f3515b0c78f", 900),
  u("photo-1496747611176-843222e1e57c", 900),
  u("photo-1469334031218-e382a71b716b", 900),
  u("photo-1483985988355-763728e1935b", 900),
];

export const SAMPLE_MEDIA = [
  u("photo-1529139574466-a303027c1d8b", 600),
  u("photo-1512436991641-6745cdb1723f", 600),
  u("photo-1596462502278-27bfdc403348", 600),
  u("photo-1490645935967-10de6ba17061", 600),
  u("photo-1505740420928-5e560c06d30e", 600),
  u("photo-1509631179647-0177331693ae", 600),
];

export const PLATFORM: Record<SocialPlatform, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  instagram: { label: "Instagram", icon: "logo-instagram", color: "#E1306C" },
  tiktok: { label: "TikTok", icon: "logo-tiktok", color: "#111111" },
  youtube: { label: "YouTube", icon: "logo-youtube", color: "#FF0000" },
  snapchat: { label: "Snapchat", icon: "logo-snapchat", color: "#E6C800" },
  facebook: { label: "Facebook", icon: "logo-facebook", color: "#1877F2" },
};
export const ALL_PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube", "snapchat", "facebook"];

export const SECTORS = [
  "Beauté & Cosmétiques",
  "Mode & Accessoires",
  "Tech & Électronique",
  "Food & Boissons",
  "Sport & Fitness",
  "Lifestyle & Maison",
  "Finance & Assurance",
  "Santé & Bien-être",
  "Éducation & Formation",
  "Tourisme & Voyage",
  "Automobile",
  "Divertissement & Média",
  "Autre",
] as const;

export const COLLAB_TYPES = [
  { value: "sponsored_post", label: "Post sponsorisé" },
  { value: "ambassador", label: "Ambassadeur" },
  { value: "event", label: "Événement" },
  { value: "product_review", label: "Test produit" },
  { value: "giveaway", label: "Jeu concours" },
  { value: "content_creation", label: "Création de contenu" },
] as const;
export const collabTypeLabel = (v: string) => COLLAB_TYPES.find((c) => c.value === v)?.label ?? v;

export const CREATOR_CATEGORIES = ["Beauté", "Mode", "Cuisine", "Humour", "Tech", "Lifestyle", "Fitness", "Musique", "Business", "Éducation"] as const;

/** "48.2K" → 48200, "1.2M" → 1200000, "12 000" → 12000 */
export function parseFollowers(s?: string): number {
  if (!s) return 0;
  const t = s.trim().replace(/\s/g, "").replace(",", ".").toUpperCase();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 0;
  if (t.endsWith("M")) return Math.round(n * 1e6);
  if (t.endsWith("K")) return Math.round(n * 1e3);
  return Math.round(n);
}

export function formatFollowers(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "À l'instant";
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d === 1) return "Hier";
  if (d < 7) return `Il y a ${d} jours`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export const CURRENCY_LABEL = { XOF: "FCFA", EUR: "€", USD: "$" } as const;
export const money = (n: number, cur: "XOF" | "EUR" | "USD" = "XOF") =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${CURRENCY_LABEL[cur]}`;

export const DEFAULT_RATES = [
  { type: "Story Instagram", price: 25000 },
  { type: "Post Instagram", price: 50000 },
  { type: "Reel / TikTok", price: 75000 },
  { type: "Vidéo YouTube", price: 150000 },
  { type: "Pack Complet", price: 250000, description: "Story + Post + Reel" },
];

/** Plateforme déduite d'un intitulé de service ("Story Instagram" → instagram). */
export function platformOfType(t: string): SocialPlatform | "pack" | "other" {
  const l = t.toLowerCase();
  if (l.startsWith("pack")) return "pack";
  if (l.includes("insta")) return "instagram";
  if (l.includes("tiktok")) return "tiktok";
  if (l.includes("youtube")) return "youtube";
  if (l.includes("snap")) return "snapchat";
  if (l.includes("facebook")) return "facebook";
  return "other";
}
