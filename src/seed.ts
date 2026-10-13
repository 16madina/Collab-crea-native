// Données de démonstration (remplacées par Supabase en phase back-end).
import type { Collaboration, Conversation, Message, Offer, Profile } from "./types";

const u = (id: string, w = 600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const d = (days: number) => new Date(Date.now() + days * 864e5).toISOString();

export const CREATOR_ID = "u_aicha";
export const BRAND_ID = "u_glow";
export const ADMIN_ID = "u_admin";

const TAGS: Record<string, string> = {"u_aicha": "Lifestyle", "u_moussa": "Gaming", "u_fatou": "Beauté", "u_kofi": "Lifestyle", "u_amina": "Lifestyle", "u_yao": "Lifestyle", "u_nadia": "Voyage", "u_ibrahim": "Lifestyle", "u_awa": "Mode", "u_chidi": "Business", "u_esther": "Lifestyle"};

// Portraits issus des maquettes (embarqués, visibles même hors ligne).
const FACE = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
  [
    require("../assets/creators/c0.jpg"),
    require("../assets/creators/c1.jpg"),
    require("../assets/creators/c2.jpg"),
    require("../assets/creators/c3.jpg"),
    require("../assets/creators/c4.jpg"),
    require("../assets/creators/c5.jpg"),
    require("../assets/creators/c6.jpg"),
    require("../assets/creators/c7.jpg"),
    require("../assets/creators/c8.jpg"),
  ][i],
);
const FACE_OF: Record<string, number> = { u_aicha: 8, u_moussa: 4, u_fatou: 1, u_kofi: 0, u_amina: 3, u_yao: 6, u_nadia: 5, u_ibrahim: 4, u_awa: 2, u_chidi: 6, u_esther: 7 };

const creator = (user_id: string, full_name: string, avatar: string, category: string, country: string, followers: Profile["followers"], extra: Partial<Profile> = {}): Profile => ({
  user_id,
  role: "creator",
  full_name,
  avatar_url: FACE_OF[user_id] !== undefined ? FACE[FACE_OF[user_id]] : u(avatar, 400),
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
      { type: "Vidéo TikTok", price: 75000, description: "Jusqu'à 60 secondes" },
      { type: "Reel Instagram", price: 75000, description: "Jusqu'à 60 secondes" },
      { type: "Story Instagram (24 h)", price: 30000, description: "1 à 3 frames" },
      { type: "Vidéo YouTube", price: 180000, description: "5 à 10 minutes" },
      { type: "Vidéo Facebook", price: 60000, description: "Jusqu'à 60 secondes" },
      { type: "Story Snapchat (24 h)", price: 30000, description: "1 à 3 frames" },
      { type: "Pack Essentiel", price: 150000, description: "1 vidéo TikTok + 1 Reel Instagram + 3 stories" },
      { type: "Pack Premium", price: 260000, description: "1 vidéo TikTok + 1 Reel Instagram + 1 YouTube" },
      { type: "Partenariat mensuel", price: 550000, description: "4 vidéos/mois (multi-plateformes) + stories" },
    ],
    options: [
      { label: "Droits d'utilisation (3 mois)", value: 50, unit: "%" },
      { label: "Exclusivité catégorie (1 mois)", value: 65000, unit: "amount" },
      { label: "Création de script par l'influenceur", value: 20000, unit: "amount" },
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
    banner_url: require("../assets/profile/cover.jpg"),
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
  brand(BRAND_ID, "Glow&Care", "photo-1596462502278-27bfdc403348", "Beauté & Cosmétiques", "Côte d'Ivoire", { banner_url: require("../assets/brand/cover.jpg"), company_description: "La beauté pour toutes. Nous collaborons avec des créatrices talentueuses pour des campagnes authentiques et inspirantes.", website: "https://glowandcare.ci" }),
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
    images: [require("../assets/offers/o1.jpg"), require("../assets/brand/c1.jpg"), require("../assets/profile/p0.jpg")],
    deliverables: ["1 Reel Instagram (30 à 60 secondes)", "1 à 2 Stories Instagram", "Mention de la marque et du produit", "Contenu authentique, créatif et naturel"],
    criteria: ["Audience engagée et authentique", "Contenu de qualité (bonne image et son)", "Respect des délais", "Correspondance avec la thématique beauté"],
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
    images: [require("../assets/offers/o2.jpg")],
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
    images: [require("../assets/offers/o3.jpg")],
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
    images: [require("../assets/offers/o4.jpg")],
    location: "Sénégal",
    deadline: d(4),
  }),
  offer({ id: "o5", brand_id: BRAND_ID, title: "Test produit : sérum éclat", category: "Beauté", budget_min: 50000, budget_max: 80000, status: "draft", images: [require("../assets/brand/c2.jpg")] }),
  offer({ id: "o6", brand_id: BRAND_ID, title: "Ambassadrice été 2026", category: "Lifestyle", budget_min: 300000, budget_max: 500000, status: "expired", deadline: d(-5), images: [require("../assets/brand/c3.jpg")] }),
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
    media_url: [require("../assets/profile/p0.jpg"), require("../assets/profile/p1.jpg"), require("../assets/profile/p2.jpg"), require("../assets/profile/p3.jpg"), require("../assets/profile/p4.jpg"), require("../assets/profile/p5.jpg")][i],
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
    { slug: "terms", title: "Conditions Générales d'Utilisation", content: "## 1. Acceptation des conditions\n\nEn accédant et en utilisant CollabCrea, vous acceptez d'être lié par ces Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.\n\n## 2. Description du service\n\nCollabCrea est une plateforme de mise en relation entre créateurs de contenu et marques en Afrique. Notre service permet aux créateurs de présenter leur profil et aux marques de proposer des collaborations.\n\n## 3. Inscription et compte\n\nPour utiliser certaines fonctionnalités de CollabCrea, vous devez créer un compte. Vous êtes responsable de :\n- Fournir des informations exactes et à jour\n- Maintenir la confidentialité de vos identifiants de connexion\n- Toutes les activités effectuées sous votre compte\n\nL'inscription est réservée aux personnes âgées de **18 ans et plus**.\n\n## 4. Utilisation acceptable\n\nVous vous engagez à ne pas :\n- Utiliser la plateforme à des fins illégales\n- Publier du contenu faux, trompeur ou diffamatoire\n- Harceler ou intimider d'autres utilisateurs\n- Tenter de compromettre la sécurité de la plateforme\n- Créer plusieurs comptes ou usurper l'identité d'autrui\n- Publier, partager ou distribuer tout contenu lié à l'exploitation ou l'abus sexuel d'enfants (CSAE)\n\n## 5. Propriété intellectuelle\n\nVous conservez tous les droits sur le contenu que vous publiez. En publiant du contenu sur CollabCrea, vous nous accordez une licence non exclusive pour afficher ce contenu sur la plateforme.\n\n## 6. Intégrations tierces et API TikTok\n\nCollabCrea peut se connecter à des services tiers (TikTok, YouTube, Instagram, etc.) pour vérifier vos statistiques.\n\n### 6.1 Données TikTok\n\nLorsque vous connectez votre compte TikTok via TikTok Login Kit, nous accédons aux données suivantes :\n- **Nom d'utilisateur et avatar** : pour identifier votre profil TikTok\n- **Nombre d'abonnés** (via le scope `user.info.stats`) : pour afficher vos statistiques vérifiées aux marques\n\n**Utilisation des données TikTok :**\n- Les données TikTok sont utilisées **uniquement** pour afficher vos statistiques vérifiées sur votre profil CollabCrea et faciliter la mise en relation avec les marques.\n- Nous ne publions **jamais** de contenu en votre nom sur TikTok.\n- Nous ne stockons **pas** vos identifiants de connexion TikTok.\n- Les données de statistiques sont mises à jour lors de chaque synchronisation et remplacent les valeurs précédentes.\n\n**Partage des données TikTok :**\n- Vos statistiques TikTok sont visibles par les marques sur la plateforme CollabCrea.\n- Nous ne partageons **pas** vos données TikTok avec d'autres tiers en dehors de ce qui est décrit dans cette politique.\n- Nous ne vendons **jamais** vos données TikTok.\n\n**Révocation :**\n- Vous pouvez déconnecter votre compte TikTok à tout moment depuis les paramètres de votre profil CollabCrea.\n- Lors de la déconnexion, vos données TikTok sont supprimées de notre plateforme.\n\n### 6.2 Données YouTube\n\nLorsque vous connectez votre compte YouTube, nous accédons uniquement au nombre d'abonnés de votre chaîne pour afficher vos statistiques vérifiées.\n\n### 6.3 Autres réseaux sociaux\n\nLes connexions aux autres réseaux sociaux sont soumises aux conditions d'utilisation de ces services respectifs.\n\n## 7. Sécurité des enfants\n\nCollabCrea applique une politique de **tolérance zéro** envers tout contenu lié à l'abus ou l'exploitation sexuelle des enfants (CSAE). Tout contenu ou comportement signalé sera immédiatement supprimé et les comptes concernés seront bannis et signalés aux autorités compétentes. Consultez notre [page dédiée à la sécurité des enfants](/child-safety) pour plus de détails.\n\n## 8. Limitation de responsabilité\n\nCollabCrea agit uniquement comme intermédiaire. Nous ne sommes pas responsables des accords conclus entre créateurs et marques, ni des litiges pouvant en découler.\n\n## 9. Modifications\n\nNous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication sur cette page.\n\n## 10. Contact\n\nPour toute question concernant ces conditions, veuillez nous contacter à : contact@collabcrea.com" },
    { slug: "privacy", title: "Politique de Confidentialité", content: "## 1. Introduction\n\nChez CollabCrea, nous prenons la protection de vos données personnelles très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.\n\n## 2. Données collectées\n\nNous collectons les types de données suivants :\n- **Informations de compte :** nom, email, numéro de téléphone, pays\n- **Informations de profil :** photo, biographie, catégorie, tarifs\n- **Données des réseaux sociaux :** nombre d'abonnés (via OAuth avec votre consentement)\n- **Documents d'identité :** pour la vérification des créateurs\n- **Données d'utilisation :** interactions avec la plateforme\n\n## 3. Utilisation des données\n\nVos données sont utilisées pour :\n- Fournir et améliorer nos services\n- Vérifier l'authenticité des profils créateurs\n- Faciliter les mises en relation avec les marques\n- Communiquer avec vous concernant votre compte\n- Assurer la sécurité de la plateforme\n\n## 4. Données collectées via TikTok\n\nLorsque vous connectez votre compte TikTok à CollabCrea via **TikTok Login Kit**, nous collectons les données suivantes avec votre consentement explicite :\n\n### 4.1 Types de données collectées\n- **Informations de profil public :** nom d'utilisateur, photo de profil (avatar)\n- **Statistiques publiques :** nombre d'abonnés (via le scope `user.info.stats`)\n\n### 4.2 Finalité de la collecte\nLes données TikTok sont collectées **exclusivement** pour :\n- Afficher vos statistiques TikTok vérifiées sur votre profil CollabCrea\n- Permettre aux marques de consulter vos métriques d'audience lors de la recherche de créateurs\n- Vérifier l'authenticité de votre profil créateur\n\n### 4.3 Stockage et conservation\n- Les données TikTok sont stockées de manière sécurisée dans notre base de données chiffrée\n- Les statistiques sont mises à jour lors de chaque synchronisation manuelle et **remplacent** les valeurs précédentes\n- Nous ne stockons **pas** vos identifiants de connexion TikTok ni votre token d'accès au-delà de la session de synchronisation\n- Les données TikTok sont conservées tant que votre compte CollabCrea est actif et que votre compte TikTok reste connecté\n\n### 4.4 Partage des données TikTok\n- Vos statistiques TikTok (nombre d'abonnés) sont **visibles publiquement** sur votre profil CollabCrea par les marques et autres utilisateurs\n- Nous ne partageons **aucune** donnée TikTok avec des tiers en dehors de l'affichage sur la plateforme CollabCrea\n- Nous ne **vendons jamais** vos données TikTok\n\n### 4.5 Suppression des données TikTok\n- Vous pouvez déconnecter votre compte TikTok à tout moment depuis les paramètres de votre profil\n- Lors de la déconnexion, vos statistiques TikTok sont **immédiatement supprimées** de notre plateforme\n- En cas de suppression de votre compte CollabCrea, toutes vos données TikTok sont supprimées dans un délai de **30 jours**\n\n## 5. Données collectées via YouTube\n\nLorsque vous connectez votre compte YouTube, nous accédons uniquement au nombre d'abonnés de votre chaîne via l'API YouTube Data v3. Les mêmes principes de stockage, partage et suppression décrits pour TikTok s'appliquent.\n\n## 6. Autres intégrations tierces\n\nPour les réseaux sociaux Facebook, Instagram et Snapchat, les statistiques sont saisies manuellement par l'utilisateur. Nous ne collectons aucune donnée automatique via ces plateformes.\n\n## 7. Partage des données\n\nNous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :\n- Les marques avec lesquelles vous choisissez de collaborer\n- Nos prestataires techniques (hébergement, analyse)\n- Les autorités si requis par la loi\n\n## 8. Sécurité\n\nNous utilisons des mesures de sécurité conformes aux standards de l'industrie pour protéger vos données, incluant le chiffrement, l'authentification sécurisée et des audits réguliers.\n\n## 9. Vos droits\n\nConformément aux lois applicables, vous avez le droit de :\n- Accéder à vos données personnelles\n- Rectifier vos informations\n- Supprimer votre compte et vos données\n- Retirer votre consentement aux intégrations tierces (TikTok, YouTube)\n- Exporter vos données\n- Vous opposer au traitement de vos données\n\n## 10. Sécurité des enfants\n\nNotre plateforme est réservée aux personnes de **18 ans et plus**. Nous appliquons une politique de tolérance zéro envers tout contenu lié à l'exploitation ou l'abus sexuel d'enfants. Consultez notre [page dédiée à la sécurité des enfants](/child-safety).\n\n## 11. Conservation des données\n\nNous conservons vos données tant que votre compte est actif. Après suppression de votre compte, vos données sont effacées dans un délai de 30 jours, sauf obligation légale de conservation.\n\n## 12. Cookies\n\nNous utilisons des cookies essentiels pour le fonctionnement de la plateforme et des cookies d'analyse pour améliorer nos services. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.\n\n## 13. Contact\n\nPour exercer vos droits ou poser des questions sur cette politique, contactez-nous à : contact@collabcrea.com" },
    { slug: "child-safety", title: "Sécurité des enfants", content: "Collab Créa interdit tout contenu impliquant des mineurs de manière inappropriée." },
  ],
  templates: [
    { id: "tp1", name: "Bienvenue", title: "Bienvenue sur Collab Créa 🎉", message: "Complétez votre profil pour recevoir vos premières offres.", type: "info" as const },
    { id: "tp2", name: "Rappel vérification", title: "Vérifiez votre identité", message: "Vérifiez votre identité pour postuler aux offres.", type: "warning" as const },
  ],
  adminLogs: [],
};
