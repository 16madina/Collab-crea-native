// Données de démonstration (remplacées par Supabase en phase back-end).
import type { Collaboration, Conversation, Message, Offer, Profile } from "./types";

const u = (id: string, w = 600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString();

export const CREATOR_ID = "u_aicha";
export const BRAND_ID = "u_glow";
export const ADMIN_ID = "u_admin";

const TAGS: Record<string, string> = {"u_aicha": "Lifestyle", "u_moussa": "Gaming", "u_fatou": "Beauté", "u_kofi": "Lifestyle", "u_amina": "Lifestyle", "u_yao": "Lifestyle", "u_nadia": "Voyage", "u_ibrahim": "Lifestyle", "u_awa": "Mode", "u_chidi": "Business", "u_esther": "Lifestyle"};

const creator = (user_id: string, full_name: string, avatar: string, category: string, country: string, followers: Profile["followers"], extra: Partial<Profile> = {}): Profile => ({
  user_id,
  role: "creator",
  full_name,
  avatar_url: u(avatar, 400),
  category,
  country,
  residence_country: country,
  followers,
  email_verified: true,
  identity_verified: true,
  rating: 4.6 + Math.round(Math.random() * 4) / 10,
  tags: [TAGS[user_id] ?? "Lifestyle"],
  bio: `Créatrice de contenu ${category.toLowerCase()} basée en ${country}.`,
  pricing: {
    currency: "XOF",
    items: [
      { type: "Story Instagram", price: 25000 },
      { type: "Reel Instagram", price: 75000 },
      { type: "Vidéo TikTok", price: 75000 },
      { type: "Pack Lancement", price: 200000, description: "1 Reel + 3 stories + 1 TikTok" },
    ],
  },
  ...extra,
});

const brand = (user_id: string, company_name: string, logo: string, sector: string, country: string, extra: Partial<Profile> = {}): Profile => ({
  user_id,
  role: "brand",
  full_name: `Équipe ${company_name}`,
  company_name,
  avatar_url: u(logo, 200),
  logo_url: u(logo, 200),
  sector,
  country,
  website: `https://${company_name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
  company_description: `${company_name} est une marque ${sector.toLowerCase()} qui collabore avec des créateurs africains.`,
  brand_prefs: { collaboration_types: ["sponsored_post", "product_review"], target_categories: ["Beauté", "Lifestyle"] },
  followers: {},
  email_verified: true,
  identity_verified: true,
  ...extra,
});

const profiles: Profile[] = [
  creator(CREATOR_ID, "Aïcha Koné", "photo-1531123897727-8f129e1688ce", "Beauté", "Côte d'Ivoire", { instagram: "48.2K", tiktok: "112K", youtube: "8.4K" }, {
    bio: "Beauté, lifestyle & bonnes adresses d'Abidjan. J'aime raconter les marques avec authenticité.",
    banner_url: u("photo-1515886657613-9f3515b0c78f", 900),
    rating: 4.9,
  }),
  creator("u_moussa", "Moussa Diop", "photo-1506794778202-cad84cf45f1d", "Tech", "Sénégal", { youtube: "210K", tiktok: "54K" }),
  creator("u_fatou", "Fatou Ndiaye", "photo-1524504388940-b1c1722653e1", "Mode", "Sénégal", { instagram: "89K", tiktok: "230K" }),
  creator("u_kofi", "Kofi Mensah", "photo-1531384441138-2736e62e0919", "Humour", "Ghana", { tiktok: "1.2M", instagram: "310K" }),
  creator("u_amina", "Amina Traoré", "photo-1589156280159-27698a70f29e", "Cuisine", "Mali", { instagram: "36K", youtube: "12K" }, { identity_verified: false, identity_submitted_at: d(-1), identity_method: "selfie" }),
  creator("u_yao", "Yao Kouassi", "photo-1507003211169-0a1dd7228f2d", "Fitness", "Côte d'Ivoire", { instagram: "64K" }, { identity_verified: false }),
  creator("u_nadia", "Nadia Bamba", "photo-1544005313-94ddf0286df2", "Lifestyle", "Côte d'Ivoire", { instagram: "142K", tiktok: "88K" }),
  creator("u_ibrahim", "Ibrahim Sow", "photo-1522529599102-193c0d76b5b6", "Fitness", "Sénégal", { youtube: "96K", instagram: "51K" }),
  creator("u_awa", "Awa Keita", "photo-1488426862026-3ee34a7d66df", "Beauté", "Mali", { tiktok: "410K", instagram: "120K" }),
  creator("u_chidi", "Chidi Okafor", "photo-1539701938214-0d9736e1c16b", "Tech", "Nigeria", { youtube: "530K" }),
  creator("u_esther", "Esther Mbarga", "photo-1534751516642-a1af1ef26a56", "Cuisine", "Cameroun", { instagram: "75K", youtube: "33K" }),
  brand(BRAND_ID, "Glow&Care", "photo-1596462502278-27bfdc403348", "Beauté & Cosmétiques", "Côte d'Ivoire"),
  brand("u_techwave", "TechWave", "photo-1518770660439-4636190af475", "Tech & Électronique", "Sénégal"),
  brand("u_cocoa", "Cocoa Bio", "photo-1490645935967-10de6ba17061", "Food & Boissons", "Côte d'Ivoire"),
  brand("u_wax", "Wax Studio", "photo-1509631179647-0177331693ae", "Mode & Accessoires", "Sénégal"),
  {
    user_id: ADMIN_ID,
    role: "admin",
    full_name: "Admin Collab Créa",
    avatar_url: u("photo-1573497019940-1c28c88b4f3e", 200),
    followers: {},
    email_verified: true,
    identity_verified: true,
  },
];

const offer = (o: Partial<Offer> & Pick<Offer, "id" | "brand_id" | "title" | "category" | "budget_min" | "budget_max">): Offer => ({
  description: "Nous recherchons des créateurs authentiques pour présenter notre produit à leur communauté.",
  content_types: ["Reel"],
  delivery_mode: "private",
  presence_mode: "remote",
  filming_by: "creator",
  on_site_slots: [],
  creative_brief: {},
  images: [],
  status: "active",
  created_at: d(-3),
  deadline: d(20),
  location: "Côte d'Ivoire, Sénégal",
  ...o,
});

const offers: Offer[] = [
  offer({
    id: "o1",
    brand_id: BRAND_ID,
    title: "Lancement nouvelle gamme soins visage",
    category: "Beauté",
    content_types: ["Reel", "Story"],
    budget_min: 120000,
    budget_max: 180000,
    description: "Glow&Care lance sa gamme hydratante au karité. Présentez votre routine du matin en vidéo et en photos.",
    expectations: "Lumière naturelle, ton doux et sincère, montrer la texture.",
    restrictions: "Pas de mention de marques concurrentes.",
    creative_brief: { hashtags: "#GlowAndCare #KaritéGlow", mentions: "@glowandcare" },
    images: [u("photo-1596462502278-27bfdc403348")],
    location: "Côte d'Ivoire",
  }),
  offer({
    id: "o2",
    brand_id: "u_techwave",
    title: "Campagne TikTok écouteurs sans fil",
    category: "Tech",
    content_types: ["TikTok"],
    budget_min: 200000,
    budget_max: 200000,
    delivery_mode: "network",
    description: "Faites découvrir nos écouteurs à votre communauté avec un format TikTok rythmé.",
    images: [u("photo-1505740420928-5e560c06d30e")],
    location: "Sénégal, Côte d'Ivoire, Bénin",
    deadline: d(9),
  }),
  offer({
    id: "o3",
    brand_id: "u_cocoa",
    title: "Recettes gourmandes au cacao bio",
    category: "Cuisine",
    content_types: ["Post Instagram", "Reel"],
    budget_min: 0,
    budget_max: 0,
    images: [u("photo-1490645935967-10de6ba17061")],
    deadline: d(30),
  }),
  offer({
    id: "o4",
    brand_id: "u_wax",
    title: "Shooting lookbook en boutique",
    category: "Mode",
    content_types: ["Reel", "Post Instagram"],
    budget_min: 250000,
    budget_max: 300000,
    presence_mode: "on_site",
    filming_by: "brand",
    on_site_city: "Dakar",
    on_site_neighborhood: "Plateau",
    on_site_store_name: "Wax Studio Plateau",
    on_site_slots: [
      { date: "2026-10-18", start_time: "09:00", end_time: "12:00" },
      { date: "2026-10-19", start_time: "14:00", end_time: "17:00" },
    ],
    images: [u("photo-1509631179647-0177331693ae")],
    location: "Sénégal",
    deadline: d(4),
  }),
  offer({ id: "o5", brand_id: BRAND_ID, title: "Test produit : sérum éclat", category: "Beauté", budget_min: 50000, budget_max: 80000, status: "draft", images: [u("photo-1571781926291-c477ebfd024b")] }),
  offer({ id: "o6", brand_id: BRAND_ID, title: "Ambassadrice été 2026", category: "Lifestyle", budget_min: 300000, budget_max: 500000, status: "expired", deadline: d(-5) }),
];

const conversations: Conversation[] = [
  { id: "c1", created_by: CREATOR_ID, participants: [CREATOR_ID, BRAND_ID], offer_id: "o1", subject: "Lancement nouvelle gamme soins visage", updated_at: d(-0.05) },
  { id: "c2", created_by: "u_techwave", participants: ["u_techwave", CREATOR_ID], offer_id: "o2", subject: "Proposition: Campagne TikTok écouteurs sans fil", updated_at: d(-0.5) },
  { id: "c3", created_by: "u_fatou", participants: ["u_fatou", BRAND_ID], offer_id: "o1", subject: "Lancement nouvelle gamme soins visage", updated_at: d(-1) },
  { id: "c4", created_by: CREATOR_ID, participants: [CREATOR_ID, "u_cocoa"], offer_id: "o3", subject: "Recettes gourmandes au cacao bio", updated_at: d(-6) },
];

const m = (id: string, conversation_id: string, sender_id: string, content: string, ago: number, read = true): Message => ({
  id,
  conversation_id,
  sender_id,
  content,
  created_at: d(-ago),
  read_at: read ? d(-ago) : undefined,
});

const messages: Message[] = [
  m("m1", "c1", CREATOR_ID, "Bonjour ! Je suis très intéressée par votre gamme, j'ai déjà un script en tête.", 2),
  m("m2", "c1", BRAND_ID, "✅ J'accepte cette proposition ! La collaboration a été créée.", 1.9),
  m("m3", "c1", BRAND_ID, "Super, le paiement est fait. Hâte de voir le contenu 🎬", 0.05, false),
  m("m4", "c2", "u_techwave", "📢 Proposition d'offre: Campagne TikTok écouteurs sans fil\n💰 Budget: 200 000 FCFA\n\nBonjour Aïcha, votre univers colle parfaitement à notre produit !", 0.5, false),
  m("m5", "c3", "u_fatou", "📅 Créneau choisi : —\n\nBonjour, je serais ravie de présenter votre gamme à ma communauté mode & beauté.", 1, false),
  m("m6", "c4", CREATOR_ID, "Voici mes recettes, j'espère qu'elles vous plaisent !", 7),
  m("m7", "c4", "u_cocoa", "Validé, merci beaucoup ! Paiement envoyé ✅", 6),
];

const collab = (c: Partial<Collaboration> & Pick<Collaboration, "id" | "offer_id" | "brand_id" | "creator_id" | "conversation_id" | "agreed_amount" | "status">): Collaboration => ({
  creator_amount: Math.round(c.agreed_amount * 0.95),
  platform_fee: Math.round(c.agreed_amount * 0.15),
  deadline: d(12),
  content_urls: [],
  paid: c.status !== "pending_payment",
  created_at: d(-2),
  ...c,
});

const collaborations: Collaboration[] = [
  collab({ id: "k1", offer_id: "o1", brand_id: BRAND_ID, creator_id: CREATOR_ID, conversation_id: "c1", agreed_amount: 150000, status: "in_progress", deadline: d(2.4) }),
  collab({
    id: "k2",
    offer_id: "o3",
    brand_id: "u_cocoa",
    creator_id: CREATOR_ID,
    conversation_id: "c4",
    agreed_amount: 100000,
    status: "completed",
    content_urls: ["https://www.instagram.com/p/recette-cacao"],
    payout_status: "completed",
    created_at: d(-12),
  }),
  collab({
    id: "k3",
    offer_id: "o1",
    brand_id: BRAND_ID,
    creator_id: "u_moussa",
    conversation_id: "c3",
    agreed_amount: 140000,
    status: "content_submitted",
    content_urls: ["https://www.tiktok.com/@moussa/video/123", "https://drive.google.com/file/d/abc"],
    content_description: "Deux versions : une courte (30 s) et une longue (55 s).",
    content_submitted_at: d(-0.4),
    auto_approve_at: d(6.6),
  }),
  collab({ id: "k4", offer_id: "o1", brand_id: BRAND_ID, creator_id: "u_kofi", conversation_id: "c3", agreed_amount: 160000, status: "pending_payment", paid: false }),
];

export const db = {
  profiles,
  offers,
  applications: [
    { id: "a1", offer_id: "o1", creator_id: CREATOR_ID, status: "accepted" as const, conversation_id: "c1", created_at: d(-2) },
    { id: "a2", offer_id: "o1", creator_id: "u_fatou", status: "pending" as const, conversation_id: "c3", created_at: d(-1) },
    { id: "a3", offer_id: "o3", creator_id: CREATOR_ID, status: "accepted" as const, conversation_id: "c4", created_at: d(-12) },
  ],
  collaborations,
  conversations,
  messages,
  notifications: [
    { id: "n1", user_id: CREATOR_ID, title: "Nouvelle proposition", message: "TechWave vous propose « Campagne TikTok écouteurs sans fil »", type: "proposal" as const, is_read: false, created_at: d(-0.5) },
    { id: "n2", user_id: CREATOR_ID, title: "Paiement sécurisé", message: "Glow&Care a versé le montant en séquestre.", type: "payment" as const, is_read: false, created_at: d(-1.9) },
    { id: "n3", user_id: CREATOR_ID, title: "💰 Paiement reçu !", message: "95 000 FCFA ont été crédités sur votre portefeuille.", type: "payment" as const, is_read: true, created_at: d(-6) },
    { id: "n4", user_id: BRAND_ID, title: "📤 Contenu soumis !", message: "Moussa Diop a soumis son contenu.", type: "info" as const, is_read: false, created_at: d(-0.4) },
    { id: "n5", user_id: BRAND_ID, title: "Nouvelle candidature", message: "Fatou Ndiaye a postulé à « Lancement nouvelle gamme soins visage »", type: "info" as const, is_read: false, created_at: d(-1) },
  ],
  transactions: [
    { id: "t1", user_id: CREATOR_ID, type: "release" as const, amount: 95000, status: "completed" as const, label: "Recettes gourmandes au cacao bio", collaboration_id: "k2", created_at: d(-6) },
    { id: "t2", user_id: CREATOR_ID, type: "withdrawal" as const, amount: -80000, status: "completed" as const, label: "Retrait effectué", collaboration_id: "w1", created_at: d(-10) },
    { id: "t3", user_id: CREATOR_ID, type: "release" as const, amount: 370000, status: "completed" as const, label: "Collaborations précédentes", created_at: d(-30) },
  ],
  wallets: [
    { user_id: CREATOR_ID, balance: 385000, pending_balance: 0 },
    { user_id: "u_moussa", balance: 60000, pending_balance: 25000 },
    { user_id: "u_fatou", balance: 140000, pending_balance: 0 },
  ],
  withdrawals: [
    { id: "w1", user_id: CREATOR_ID, amount: 80000, method: "mobile_money" as const, mobile_provider: "wave", mobile_number: "0707070707", status: "completed" as const, proof_url: "preuve.jpg", created_at: d(-10) },
    { id: "w2", user_id: "u_moussa", amount: 25000, method: "mobile_money" as const, mobile_provider: "orange", mobile_number: "771234567", status: "pending" as const, created_at: d(-1) },
    { id: "w3", user_id: "u_fatou", amount: 50000, method: "paypal" as const, paypal_email: "fatou@mail.com", payout_currency: "EUR" as const, status: "pending" as const, created_at: d(-0.3) },
  ],
  portfolio: [
    "photo-1515886657613-9f3515b0c78f",
    "photo-1529139574466-a303027c1d8b",
    "photo-1496747611176-843222e1e57c",
    "photo-1483985988355-763728e1935b",
    "photo-1512436991641-6745cdb1723f",
    "photo-1469334031218-e382a71b716b",
  ].map((p, i) => ({
    id: `p${i}`,
    user_id: CREATOR_ID,
    title: ["Routine karité", "Look wax", "Shooting plage", "Haul mode", "Unboxing", "Soirée Abidjan"][i],
    media_type: (i % 3 === 1 ? "video" : "image") as "video" | "image",
    media_url: u(p, 500),
    platform: ["Instagram", "TikTok", "Instagram", "YouTube", "TikTok", "Instagram"][i],
    views_count: [12000, 89000, 4300, 21000, 56000, 9800][i],
  })),
  socialVerifications: [
    { id: "s1", user_id: "u_fatou", platform: "tiktok" as const, page_name: "@fatou.style", claimed_followers: "230K", ai_extracted_name: "fatou.style", ai_extracted_followers: "228K", ai_confidence: 72, status: "pending_admin" as const, created_at: d(-0.6) },
  ],
  reports: [
    { id: "r1", reporter_id: CREATOR_ID, report_type: "offer" as const, target_offer_id: "o6", target_user_id: BRAND_ID, reason: "Offre trompeuse / Fausses informations", description: "Le budget annoncé ne correspond pas.", status: "pending" as const, created_at: d(-2) },
    { id: "r2", reporter_id: BRAND_ID, report_type: "user" as const, target_user_id: "u_yao", reason: "Faux profil / Usurpation d'identité", status: "pending" as const, created_at: d(-1) },
  ],
  blocked: [],
  favorites: [{ brand_id: BRAND_ID, creator_id: "u_fatou" }],
  reviews: [{ id: "rv1", brand_id: "u_cocoa", creator_id: CREATOR_ID, collaboration_id: "k2", rating: 5, comment: "Contenu magnifique, livré en avance. Merci !", created_at: d(-6) }],
  inviteCodes: [
    { code: "COLLAB-X7K9", is_active: true, note: "Lancement" },
    { code: "COLLAB-A2B3", is_active: true },
    { code: "COLLAB-Q8RT", is_active: true, used_by: "u_yao", used_at: d(-4) },
  ],
  legalPages: [
    { slug: "terms", title: "Conditions générales d'utilisation", content: "## 1. Objet\nCollab Créa met en relation des créateurs de contenu et des marques.\n\n## 2. Paiements\nLes paiements sont sécurisés par séquestre et versés après validation du contenu." },
    { slug: "privacy", title: "Politique de confidentialité", content: "## Données collectées\nNous collectons les informations nécessaires au fonctionnement du service.\n\n## Vos droits\nVous pouvez demander la suppression de votre compte à tout moment." },
    { slug: "child-safety", title: "Sécurité des enfants", content: "Collab Créa interdit tout contenu impliquant des mineurs de manière inappropriée." },
  ],
  templates: [
    { id: "tp1", name: "Bienvenue", title: "Bienvenue sur Collab Créa 🎉", message: "Complétez votre profil pour recevoir vos premières offres.", type: "info" as const },
    { id: "tp2", name: "Rappel vérification", title: "Vérifiez votre identité", message: "Vérifiez votre identité pour postuler aux offres.", type: "warning" as const },
  ],
  adminLogs: [],
};
