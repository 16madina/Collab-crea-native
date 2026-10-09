// Données fictives — remplacées par Supabase lors de la phase back-end.

const u = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const me = {
  name: "Aïcha",
  fullName: "Aïcha Koné",
  role: "Créatrice de contenu",
  city: "Abidjan, Côte d'Ivoire",
  avatar: u("photo-1531123897727-8f129e1688ce", 300),
  followers: "48,2k",
  collabs: 27,
  rating: 4.9,
  balance: 385000,
  bio: "Beauté, lifestyle & bonnes adresses d'Abidjan. J'aime raconter les marques avec authenticité.",
};

export const categories = [
  { key: "all", label: "Toutes", icon: "grid-outline" },
  { key: "beauty", label: "Beauté", icon: "color-palette-outline" },
  { key: "fashion", label: "Mode", icon: "shirt-outline" },
  { key: "tech", label: "Tech", icon: "phone-portrait-outline" },
  { key: "food", label: "Alimentation", icon: "restaurant-outline" },
  { key: "travel", label: "Voyage", icon: "airplane-outline" },
] as const;

export type Category = (typeof categories)[number]["key"];

export type Offer = {
  id: string;
  brand: string;
  brandColor: string;
  title: string;
  format: string;
  location: string;
  deadline: string;
  budget: number;
  image: string;
  tag?: "Nouveau" | "Sponsorisé" | "Urgent";
  category: Category;
  description: string;
  deliverables: string[];
  applicants: number;
};

export const offers: Offer[] = [
  {
    id: "1",
    brand: "Glow&Care",
    brandColor: "#F2A33A",
    title: "Lancement nouvelle gamme soins visage",
    format: "Vidéo + photos",
    location: "Côte d'Ivoire",
    deadline: "Avant le 30 avr.",
    budget: 150000,
    image: u("photo-1596462502278-27bfdc403348"),
    tag: "Nouveau",
    category: "beauty",
    description:
      "Glow&Care lance sa gamme hydratante à base de karité. Nous cherchons des créatrices authentiques pour présenter la routine du matin en vidéo et en photos.",
    deliverables: ["1 Reel Instagram (30–60 s)", "3 photos produit", "2 stories avec lien"],
    applicants: 42,
  },
  {
    id: "2",
    brand: "TechWave",
    brandColor: "#2F6BFF",
    title: "Campagne TikTok produit innovant",
    format: "Vidéo TikTok",
    location: "Afrique de l'Ouest",
    deadline: "Avant le 15 mai",
    budget: 200000,
    image: u("photo-1507003211169-0a1dd7228f2d"),
    tag: "Sponsorisé",
    category: "tech",
    description:
      "Faites découvrir nos nouveaux écouteurs sans fil à votre communauté avec un format TikTok créatif et rythmé.",
    deliverables: ["2 vidéos TikTok", "1 live de 20 min"],
    applicants: 87,
  },
  {
    id: "3",
    brand: "Cocoa Bio",
    brandColor: "#1FA463",
    title: "Contenu UGC recettes gourmandes",
    format: "Photos + recettes",
    location: "En ligne",
    deadline: "Avant le 2 juin",
    budget: 100000,
    image: u("photo-1490645935967-10de6ba17061"),
    category: "food",
    description:
      "Créez des recettes simples et gourmandes avec notre cacao bio de Soubré. Ton chaleureux et familial.",
    deliverables: ["4 photos recettes", "1 carrousel Instagram"],
    applicants: 19,
  },
  {
    id: "4",
    brand: "Wax Studio",
    brandColor: "#C2185B",
    title: "Lookbook collection Saison Sèche",
    format: "Shooting mode",
    location: "Dakar, Sénégal",
    deadline: "Avant le 10 juin",
    budget: 250000,
    image: u("photo-1509631179647-0177331693ae"),
    tag: "Urgent",
    category: "fashion",
    description: "Portez la nouvelle collection et créez un lookbook éditorial dans les rues de Dakar.",
    deliverables: ["8 photos éditoriales", "1 Reel transition"],
    applicants: 64,
  },
  {
    id: "5",
    brand: "Air Sahel",
    brandColor: "#0E9AA7",
    title: "Vlog week-end à Assinie",
    format: "Vlog YouTube",
    location: "Assinie",
    deadline: "Avant le 20 juin",
    budget: 350000,
    image: u("photo-1500530855697-b586d89ba3ee"),
    category: "travel",
    description: "Un week-end tout compris pour raconter Assinie à votre audience en format vlog.",
    deliverables: ["1 vlog YouTube (8–12 min)", "3 Reels"],
    applicants: 23,
  },
];

export const brands = [
  { name: "Orange", color: "#FF7900", text: "#FFFFFF" },
  { name: "CANAL+", color: "#111111", text: "#FFFFFF" },
  { name: "Yasmine", color: "#FFFFFF", text: "#D62828" },
  { name: "JUMIA", color: "#FFFFFF", text: "#F68B1E" },
  { name: "Infinix", color: "#FFFFFF", text: "#111111" },
  { name: "Nestlé", color: "#FFFFFF", text: "#5A6B7B" },
];

export const heroSlides = [
  {
    title: "Des marques qui partagent votre univers",
    cta: "Découvrir les campagnes",
    image: u("photo-1542038784456-1ea8e935640e", 800),
  },
  {
    title: "Paiements Mobile Money garantis",
    cta: "Voir mon portefeuille",
    image: u("photo-1573497019940-1c28c88b4f3e", 800),
  },
];

export const landingFaces = [
  u("photo-1531123897727-8f129e1688ce", 200),
  u("photo-1506794778202-cad84cf45f1d", 200),
  u("photo-1524504388940-b1c1722653e1", 200),
  u("photo-1531384441138-2736e62e0919", 200),
];

export const landingHero = {
  main: u("photo-1589156280159-27698a70f29e", 700),
  second: u("photo-1506634572416-48cdfe530110", 500),
};

export type Conversation = {
  id: string;
  name: string;
  avatar: string;
  last: string;
  time: string;
  unread: number;
  online?: boolean;
  campaign: string;
};

export const conversations: Conversation[] = [
  {
    id: "c1",
    name: "Glow&Care",
    avatar: u("photo-1596462502278-27bfdc403348", 200),
    last: "Super ! On valide le script, vous pouvez tourner 🎬",
    time: "09:42",
    unread: 2,
    online: true,
    campaign: "Gamme soins visage",
  },
  {
    id: "c2",
    name: "TechWave",
    avatar: u("photo-1507003211169-0a1dd7228f2d", 200),
    last: "Le colis est parti ce matin.",
    time: "Hier",
    unread: 0,
    campaign: "Campagne TikTok",
  },
  {
    id: "c3",
    name: "Wax Studio",
    avatar: u("photo-1509631179647-0177331693ae", 200),
    last: "Vous êtes disponible jeudi pour le shooting ?",
    time: "Lun.",
    unread: 1,
    online: true,
    campaign: "Lookbook Saison Sèche",
  },
  {
    id: "c4",
    name: "Cocoa Bio",
    avatar: u("photo-1490645935967-10de6ba17061", 200),
    last: "Paiement envoyé ✅ Merci pour le travail !",
    time: "12 avr.",
    unread: 0,
    campaign: "Recettes UGC",
  },
];

export const messages = [
  { id: "m1", me: false, text: "Bonjour Aïcha ! Votre proposition nous a beaucoup plu.", time: "09:10" },
  { id: "m2", me: true, text: "Merci beaucoup 🙏 J'ai préparé un script pour le Reel.", time: "09:15" },
  { id: "m3", me: true, text: "Routine du matin, lumière naturelle, ton très doux.", time: "09:15" },
  { id: "m4", me: false, text: "Super ! On valide le script, vous pouvez tourner 🎬", time: "09:42" },
];

export const myCollabs = [
  { id: "1", status: "En cours", progress: 0.6 },
  { id: "2", status: "Livré", progress: 1 },
  { id: "4", status: "Candidature", progress: 0.15 },
];

export const portfolio = [
  u("photo-1515886657613-9f3515b0c78f", 400),
  u("photo-1529139574466-a303027c1d8b", 400),
  u("photo-1496747611176-843222e1e57c", 400),
  u("photo-1483985988355-763728e1935b", 400),
  u("photo-1512436991641-6745cdb1723f", 400),
  u("photo-1469334031218-e382a71b716b", 400),
];

export const transactions = [
  { id: "t1", label: "Cocoa Bio — Recettes UGC", amount: 100000, date: "12 avr.", in: true },
  { id: "t2", label: "Retrait Orange Money", amount: -80000, date: "8 avr.", in: false },
  { id: "t3", label: "TechWave — Acompte", amount: 100000, date: "2 avr.", in: true },
];

export const fcfa = (n: number) =>
  `${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
