// Base de données fictive en mémoire + actions métier.
// Chaque action reproduit la règle de la version web (docs/spec) ; elle sera
// remplacée par un appel Supabase (table / RPC / fonction edge) en phase back-end.
import { create } from "zustand";
import {
  Application,
  AppNotification,
  Collaboration,
  CollabStatus,
  Conversation,
  InviteCode,
  LegalPage,
  Message,
  NotificationTemplate,
  NotificationType,
  Offer,
  PortfolioItem,
  Profile,
  Report,
  Role,
  Slot,
  SocialVerification,
  Transaction,
  Wallet,
  Withdrawal,
} from "./types";
import * as seed from "./seed";

// ---------- règles ----------
export const MIN_AGREED = 200;
export const BRAND_FEE = 0.1;
export const CREATOR_FEE = 0.05;
export const CARD_SURCHARGE = 0.05;
export const WITHDRAW_MIN = { mobile_money: 1000, paypal: 3000, bank: 1000 } as const;

export function computeCommission(agreed: number) {
  const a = Math.max(MIN_AGREED, Math.round(Number.isFinite(agreed) ? agreed : MIN_AGREED));
  const brandFee = Math.round(a * BRAND_FEE);
  const creatorFee = Math.round(a * CREATOR_FEE);
  return {
    agreed_amount: a,
    brand_total: a + brandFee,
    brand_total_card: Math.round((a + brandFee) * (1 + CARD_SURCHARGE)),
    creator_amount: a - creatorFee,
    platform_fee: brandFee + creatorFee,
    brandFee,
    creatorFee,
  };
}

export const fcfa = (n: number) => `${Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;

export const budgetLabel = (o: Pick<Offer, "budget_min" | "budget_max">) =>
  o.budget_min === 0 && o.budget_max === 0
    ? "Négociable"
    : o.budget_min === o.budget_max
      ? fcfa(o.budget_min)
      : `${fcfa(o.budget_min).replace(" FCFA", "")} – ${fcfa(o.budget_max)}`;

// Aperçu web : ?demo=creator|brand|admin connecte directement le compte de démo.
function demoFromUrl(): string | null {
  const q = typeof window !== "undefined" && window.location ? new URLSearchParams(window.location.search).get("demo") : null;
  return q === "admin" ? seed.ADMIN_ID : q === "brand" ? seed.BRAND_ID : q === "creator" ? seed.CREATOR_ID : null;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString();

type Result = { ok: true; id?: string } | { ok: false; error: string };

type DB = {
  // session
  userId: string | null;
  guest: boolean; // visiteur sans compte (accès en lecture)
  archived: string[]; // conversations archivées par l'utilisateur courant
  follows: string[]; // créateurs suivis par l'utilisateur courant
  inviteRequired: boolean;
  inviteUnlocked: boolean;

  profiles: Profile[];
  offers: Offer[];
  applications: Application[];
  collaborations: Collaboration[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  transactions: Transaction[];
  wallets: Wallet[];
  withdrawals: Withdrawal[];
  portfolio: PortfolioItem[];
  socialVerifications: SocialVerification[];
  reports: Report[];
  blocked: { blocker_id: string; blocked_id: string }[];
  favorites: { brand_id: string; creator_id: string }[];
  reviews: { id: string; brand_id: string; creator_id: string; collaboration_id: string; rating: number; comment: string; created_at: string }[];
  inviteCodes: InviteCode[];
  legalPages: LegalPage[];
  templates: NotificationTemplate[];
  adminLogs: { id: string; action_type: string; target_user_id?: string; details?: unknown; created_at: string }[];
};

type Actions = {
  // auth
  signIn: (email: string, password: string) => Result;
  demoSignIn: (role: Role) => void;
  signUp: (p: Omit<Profile, "user_id" | "email_verified" | "identity_verified" | "followers"> & { email: string; inviteCode?: string }) => Result;
  signOut: () => void;
  continueAsGuest: () => void;
  toggleArchive: (conversationId: string) => boolean;
  toggleFollow: (userId: string) => boolean;
  startConversation: (otherId: string) => Result;
  claimInvite: (code: string) => Result;
  // profil
  updateProfile: (patch: Partial<Profile>) => void;
  submitIdentity: (method: "document" | "selfie") => void;
  submitSocialVerification: (v: Pick<SocialVerification, "platform" | "page_name" | "claimed_followers">) => SocialVerification;
  // offres
  saveOffer: (o: Omit<Offer, "id" | "brand_id" | "created_at"> & { id?: string }) => Result;
  deleteOffer: (id: string) => void;
  renewOffer: (id: string) => void;
  applyToOffer: (offerId: string, message?: string, slot?: Slot) => Result;
  proposeOffer: (offerId: string, creatorId: string, message?: string) => Result;
  // collaborations
  acceptProposal: (conversationId: string, agreed?: number) => Result;
  refuseProposal: (conversationId: string) => Result;
  pay: (collabId: string, method: "mobile_money" | "card") => Result;
  submitContent: (collabId: string, urls: string[], description?: string) => Result;
  markPreviewViewed: (collabId: string) => void;
  approveContent: (collabId: string) => Result;
  requestRevision: (collabId: string, feedback: string) => Result;
  submitPublication: (collabId: string, url: string) => Result;
  approvePublication: (collabId: string) => Result;
  rateCreator: (collabId: string, rating: number, comment: string) => void;
  toggleFavorite: (creatorId: string) => void;
  // messagerie
  sendMessage: (conversationId: string, content: string) => Result;
  markConversationRead: (conversationId: string) => void;
  blockUser: (id: string) => Result;
  report: (r: Omit<Report, "id" | "reporter_id" | "status" | "created_at">) => void;
  // portefeuille
  requestWithdrawal: (w: Omit<Withdrawal, "id" | "user_id" | "status" | "created_at">) => Result;
  // portfolio
  addPortfolio: (p: Omit<PortfolioItem, "id" | "user_id">) => void;
  removePortfolio: (id: string) => void;
  // notifications
  notify: (userId: string, title: string, message: string, type?: NotificationType) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  // admin
  adminSetBan: (userId: string, banned: boolean, reason?: string) => void;
  adminReviewIdentity: (userId: string, approve: boolean, reason?: string) => void;
  adminReviewSocial: (id: string, approve: boolean, notes?: string) => void;
  adminReviewReport: (id: string, action: "dismiss" | "resolve" | "ban", notes?: string) => void;
  adminFinalizeWithdrawal: (id: string) => void;
  adminRejectWithdrawal: (id: string, reason: string) => void;
  adminBroadcast: (target: "all" | Role, title: string, message: string, type: NotificationType) => number;
  adminSetInviteRequired: (v: boolean) => void;
  adminGenerateCodes: (n: number, note?: string) => string[];
  adminToggleCode: (code: string) => void;
  adminDeleteCode: (code: string) => void;
  adminUpdateLegal: (slug: string, title: string, content: string) => void;
  adminSaveTemplate: (t: Omit<NotificationTemplate, "id"> & { id?: string }) => void;
  adminDeleteTemplate: (id: string) => void;
};

export const useDB = create<DB & Actions>()((set, get) => {
  const log = (action_type: string, target_user_id?: string, details?: unknown) =>
    set((s) => ({ adminLogs: [{ id: uid(), action_type, target_user_id, details, created_at: now() }, ...s.adminLogs] }));
  const patchCollab = (id: string, patch: Partial<Collaboration>) =>
    set((s) => ({ collaborations: s.collaborations.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const collab = (id: string) => get().collaborations.find((c) => c.id === id);
  const offerOf = (c: Collaboration) => get().offers.find((o) => o.id === c.offer_id);
  const systemMsg = (conversation_id: string, sender_id: string, content: string) =>
    set((s) => ({
      messages: [...s.messages, { id: uid(), conversation_id, sender_id, content, created_at: now() }],
      conversations: s.conversations.map((c) => (c.id === conversation_id ? { ...c, updated_at: now() } : c)),
    }));
  const ensureWallet = (user_id: string) => {
    if (!get().wallets.find((w) => w.user_id === user_id)) set((s) => ({ wallets: [...s.wallets, { user_id, balance: 0, pending_balance: 0 }] }));
  };
  const release = (c: Collaboration) => {
    ensureWallet(c.creator_id);
    set((s) => ({
      wallets: s.wallets.map((w) => (w.user_id === c.creator_id ? { ...w, balance: w.balance + c.creator_amount } : w)),
      transactions: [
        { id: uid(), user_id: c.creator_id, type: "release", amount: c.creator_amount, status: "completed", label: `${offerOf(c)?.title ?? "Collaboration"}`, collaboration_id: c.id, created_at: now() },
        ...s.transactions.map((t) => (t.collaboration_id === c.id && t.type === "escrow" ? { ...t, status: "completed" as const } : t)),
      ],
    }));
    patchCollab(c.id, { status: "completed", payout_status: "completed" });
    get().notify(c.creator_id, "💰 Paiement reçu !", `${fcfa(c.creator_amount)} ont été crédités sur votre portefeuille.`, "payment");
  };
  const newConversation = (created_by: string, other: string, subject: string, offer_id?: string) => {
    const id = uid();
    set((s) => ({ conversations: [{ id, created_by, participants: [created_by, other], subject, offer_id, updated_at: now() }, ...s.conversations] }));
    return id;
  };

  return {
    ...seed.db,
    userId: demoFromUrl(),
    guest: false,
    archived: [],
    follows: [],
    inviteRequired: false,
    inviteUnlocked: false,

    signIn: (email, password) => {
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Email invalide" };
      if (password.length < 6) return { ok: false, error: "Minimum 6 caractères" };
      const role: Role = email.startsWith("admin") ? "admin" : email.startsWith("marque") || email.startsWith("brand") ? "brand" : "creator";
      get().demoSignIn(role);
      return { ok: true };
    },
    demoSignIn: (role) => set({ guest: false, userId: role === "admin" ? seed.ADMIN_ID : role === "brand" ? seed.BRAND_ID : seed.CREATOR_ID }),
    signUp: ({ email, inviteCode, ...p }) => {
      const s = get();
      if (s.inviteRequired) {
        const c = s.inviteCodes.find((x) => x.code === inviteCode?.toUpperCase());
        if (!c || !c.is_active || c.used_by) return { ok: false, error: "Code invalide ou déjà utilisé" };
      }
      if (email === "deja@collabcrea.com") return { ok: false, error: "Cet email est déjà utilisé" };
      const user_id = uid();
      set((st) => ({
        profiles: [...st.profiles, { ...p, user_id, followers: {}, email_verified: false, identity_verified: false } as Profile],
        inviteCodes: st.inviteCodes.map((c) => (c.code === inviteCode?.toUpperCase() ? { ...c, used_by: user_id, used_at: now() } : c)),
        userId: user_id,
        wallets: [...st.wallets, { user_id, balance: 0, pending_balance: 0 }],
      }));
      return { ok: true, id: user_id };
    },
    signOut: () => set({ userId: null, guest: false, inviteUnlocked: false }),
    continueAsGuest: () => set({ guest: true }),
    toggleFollow: (id) => {
      const on = !get().follows.includes(id);
      set((s) => ({ follows: on ? [...s.follows, id] : s.follows.filter((x) => x !== id) }));
      return on;
    },
    startConversation: (otherId) => {
      const s = get();
      if (!s.userId) return { ok: false, error: "Connecte-toi pour envoyer un message" };
      const existing = s.conversations.find((c) => !c.offer_id && c.participants.includes(s.userId!) && c.participants.includes(otherId));
      if (existing) return { ok: true, id: existing.id };
      const me = s.profiles.find((p) => p.user_id === s.userId)!;
      return { ok: true, id: newConversation(s.userId, otherId, `Conversation avec ${me.company_name ?? me.full_name}`) };
    },
    toggleArchive: (id) => {
      const on = !get().archived.includes(id);
      set((s) => ({ archived: on ? [...s.archived, id] : s.archived.filter((x) => x !== id) }));
      return on;
    },
    claimInvite: (code) => {
      const c = code.trim().toUpperCase();
      if (!/^COLLAB-[A-Z0-9]{4}$/.test(c)) return { ok: false, error: "Format invalide (ex: COLLAB-X7K9)" };
      const found = get().inviteCodes.find((x) => x.code === c && x.is_active && !x.used_by);
      if (!found) return { ok: false, error: "Code invalide ou déjà utilisé" };
      set({ inviteUnlocked: true });
      return { ok: true };
    },

    updateProfile: (patch) => set((s) => ({ profiles: s.profiles.map((p) => (p.user_id === s.userId ? { ...p, ...patch } : p)) })),
    submitIdentity: (method) => get().updateProfile({ identity_method: method, identity_submitted_at: now() }),
    submitSocialVerification: (v) => {
      // Simule l'analyse IA de la capture : confiance aléatoire, vérifié au-delà de 80 %.
      const conf = 60 + Math.round(Math.random() * 40);
      const rec: SocialVerification = {
        ...v,
        id: uid(),
        user_id: get().userId!,
        ai_extracted_name: v.page_name,
        ai_extracted_followers: v.claimed_followers,
        ai_confidence: conf,
        status: conf >= 80 ? "verified" : "pending_admin",
        created_at: now(),
      };
      set((s) => ({ socialVerifications: [rec, ...s.socialVerifications] }));
      if (rec.status === "verified") {
        const me = get().profiles.find((p) => p.user_id === rec.user_id)!;
        get().updateProfile({ followers: { ...me.followers, [v.platform]: v.claimed_followers } });
      }
      return rec;
    },

    saveOffer: ({ id, ...o }) => {
      const s = get();
      if (!o.title.trim()) return { ok: false, error: "Le titre est requis" };
      if (!o.description.trim()) return { ok: false, error: "La description est requise" };
      if (!o.category) return { ok: false, error: "La catégorie est requise" };
      if (!o.content_types.length) return { ok: false, error: "Sélectionnez au moins un type de contenu" };
      if (o.presence_mode === "on_site") {
        if (!o.on_site_city?.trim()) return { ok: false, error: "La ville est requise pour le mode sur place" };
        if (!o.on_site_slots.length) return { ok: false, error: "Ajoutez au moins un créneau de disponibilité" };
        if (o.on_site_slots.some((x) => !x.date)) return { ok: false, error: "Remplissez la date de chaque créneau" };
      }
      if (!(o.budget_min === 0 && o.budget_max === 0)) {
        if (o.budget_min < MIN_AGREED) return { ok: false, error: "Le montant minimum est de 200 FCFA" };
        if (o.budget_min > o.budget_max) return { ok: false, error: "Le minimum doit être inférieur au maximum" };
      }
      const clean = o.presence_mode === "remote" ? { ...o, on_site_city: undefined, on_site_neighborhood: undefined, on_site_store_name: undefined, on_site_slots: [], filming_by: "creator" as const } : o;
      if (id) {
        set((st) => ({ offers: st.offers.map((x) => (x.id === id && x.brand_id === s.userId ? { ...x, ...clean } : x)) }));
        return { ok: true, id };
      }
      const nid = uid();
      set((st) => ({ offers: [{ ...clean, id: nid, brand_id: s.userId!, created_at: now() }, ...st.offers] }));
      return { ok: true, id: nid };
    },
    deleteOffer: (id) => set((s) => ({ offers: s.offers.filter((o) => !(o.id === id && o.brand_id === s.userId)) })),
    renewOffer: (id) => set((s) => ({ offers: s.offers.map((o) => (o.id === id && o.brand_id === s.userId ? { ...o, status: "active", deadline: inDays(30) } : o)) })),

    applyToOffer: (offerId, message, slot) => {
      const s = get();
      const me = s.profiles.find((p) => p.user_id === s.userId)!;
      if (!me.identity_verified) return { ok: false, error: "Vérifiez votre identité pour postuler aux offres" };
      const offer = s.offers.find((o) => o.id === offerId)!;
      if (offer.on_site_slots.length && !slot) return { ok: false, error: "Veuillez sélectionner un créneau" };
      const existing = s.applications.find((a) => a.offer_id === offerId && a.creator_id === me.user_id);
      const activeCollab = s.collaborations.some((c) => c.offer_id === offerId && c.creator_id === me.user_id && !["cancelled", "refused"].includes(c.status));
      if (existing && (existing.status === "accepted" || (existing.status === "pending" && activeCollab)))
        return { ok: false, error: "Vous avez déjà postulé à cette offre" };
      const convId = existing?.conversation_id ?? newConversation(me.user_id, offer.brand_id, offer.title, offer.id);
      const content = existing
        ? "📩 Je souhaite postuler à nouveau pour cette offre."
        : `${slot ? `📅 Créneau choisi : ${slot.date} ${slot.start_time}–${slot.end_time}\n\n` : ""}${message?.trim() || "Bonjour, je suis intéressé(e) par votre offre."}`;
      if (existing) set((st) => ({ applications: st.applications.map((a) => (a.id === existing.id ? { ...a, status: "pending", message, selected_slot: slot } : a)) }));
      else
        set((st) => ({
          applications: [{ id: uid(), offer_id: offerId, creator_id: me.user_id, message, selected_slot: slot, status: "pending", conversation_id: convId, created_at: now() }, ...st.applications],
        }));
      systemMsg(convId, me.user_id, content);
      get().notify(offer.brand_id, "Nouvelle candidature", `${me.full_name} a postulé à « ${offer.title} »`, "info");
      return { ok: true, id: convId };
    },
    proposeOffer: (offerId, creatorId, message) => {
      const s = get();
      const me = s.profiles.find((p) => p.user_id === s.userId)!;
      if (!me.email_verified) return { ok: false, error: "Vous devez vérifier votre email avant de contacter un créateur" };
      const offer = s.offers.find((o) => o.id === offerId)!;
      const dup = s.collaborations.find((c) => c.offer_id === offerId && c.creator_id === creatorId && !["completed", "refused"].includes(c.status));
      if (dup) return { ok: false, error: "Une collaboration est déjà en cours pour cette offre" };
      const convId = newConversation(me.user_id, creatorId, `Proposition: ${offer.title}`, offer.id);
      systemMsg(convId, me.user_id, `📢 Proposition d'offre: ${offer.title}\n💰 Budget: ${budgetLabel(offer)}\n\n${message?.trim() || "Bonjour, je vous propose cette collaboration."}`);
      get().notify(creatorId, "Nouvelle proposition", `${me.company_name ?? me.full_name} vous propose « ${offer.title} »`, "proposal");
      return { ok: true, id: convId };
    },

    acceptProposal: (conversationId, agreed) => {
      const s = get();
      const conv = s.conversations.find((c) => c.id === conversationId)!;
      const offer = s.offers.find((o) => o.id === conv.offer_id);
      if (!offer) return { ok: false, error: "Offre introuvable" };
      const creator_id = conv.participants.find((p) => p !== offer.brand_id)!;
      const amount = agreed ?? Math.round((offer.budget_min + offer.budget_max) / 2);
      const c = computeCommission(amount);
      const id = uid();
      set((st) => ({
        collaborations: [
          {
            id,
            offer_id: offer.id,
            brand_id: offer.brand_id,
            creator_id,
            conversation_id: conversationId,
            agreed_amount: c.agreed_amount,
            creator_amount: c.creator_amount,
            platform_fee: c.platform_fee,
            status: "pending_payment",
            deadline: offer.deadline ?? inDays(14),
            content_urls: [],
            paid: false,
            created_at: now(),
          },
          ...st.collaborations,
        ],
        applications: st.applications.map((a) => (a.conversation_id === conversationId ? { ...a, status: "accepted" } : a)),
      }));
      systemMsg(conversationId, s.userId!, "✅ J'accepte cette proposition ! La collaboration a été créée.");
      const other = conv.participants.find((p) => p !== s.userId)!;
      get().notify(other, "✅ Collaboration acceptée !", offer.title, "success");
      return { ok: true, id };
    },
    refuseProposal: (conversationId) => {
      const s = get();
      const conv = s.conversations.find((c) => c.id === conversationId)!;
      const offer = s.offers.find((o) => o.id === conv.offer_id)!;
      const creator_id = conv.participants.find((p) => p !== offer.brand_id)!;
      set((st) => ({
        collaborations: [
          { id: uid(), offer_id: offer.id, brand_id: offer.brand_id, creator_id, conversation_id: conversationId, agreed_amount: 0, creator_amount: 0, platform_fee: 0, status: "refused", deadline: now(), content_urls: [], paid: false, created_at: now() },
          ...st.collaborations,
        ],
        applications: st.applications.map((a) => (a.conversation_id === conversationId ? { ...a, status: "rejected" } : a)),
      }));
      systemMsg(conversationId, s.userId!, "❌ Je décline cette proposition. Merci pour votre intérêt.");
      return { ok: true };
    },
    pay: (collabId, method) => {
      const c = collab(collabId)!;
      if (!["pending_payment", "content_submitted"].includes(c.status)) return { ok: false, error: "Paiement impossible à cette étape" };
      const next: CollabStatus = c.status === "pending_payment" ? "in_progress" : "in_review";
      set((s) => ({
        transactions: [{ id: uid(), user_id: c.brand_id, type: "escrow", amount: computeCommission(c.agreed_amount)[method === "card" ? "brand_total_card" : "brand_total"], status: "pending", label: `Séquestre — ${offerOf(c)?.title}`, collaboration_id: c.id, created_at: now() }, ...s.transactions],
      }));
      patchCollab(collabId, { status: next, paid: true });
      get().notify(c.creator_id, "Paiement sécurisé", "La marque a versé le montant en séquestre. Vous pouvez commencer !", "payment");
      return { ok: true };
    },
    submitContent: (collabId, urls, description) => {
      const c = collab(collabId)!;
      const clean = urls.map((u) => u.trim()).filter(Boolean);
      if (!clean.length) return { ok: false, error: "Ajoutez au moins un lien ou une vidéo" };
      const brandFilms = offerOf(c)?.filming_by === "brand";
      patchCollab(collabId, {
        content_urls: clean,
        content_description: description,
        content_submitted_at: now(),
        auto_approve_at: inDays(brandFilms ? 2 : 7),
        status: "content_submitted",
      });
      get().notify(brandFilms ? c.creator_id : c.brand_id, "📤 Contenu soumis !", offerOf(c)?.title ?? "", "info");
      return { ok: true };
    },
    markPreviewViewed: (collabId) => patchCollab(collabId, { preview_viewed_at: now() }),
    approveContent: (collabId) => {
      const c = collab(collabId)!;
      if (!c.paid) return { ok: false, error: "Payez d'abord pour débloquer le contenu" };
      if (offerOf(c)?.delivery_mode === "network") {
        patchCollab(collabId, { status: "pending_publication" });
        get().notify(c.creator_id, "🎉 Aperçu approuvé !", "Publiez le contenu puis soumettez le lien.", "success");
        return { ok: true };
      }
      release(c);
      return { ok: true };
    },
    requestRevision: (collabId, feedback) => {
      if (!feedback.trim()) return { ok: false, error: "Décrivez les modifications souhaitées" };
      const c = collab(collabId)!;
      patchCollab(collabId, { status: "revision_requested", brand_feedback: feedback, content_submitted_at: undefined, auto_approve_at: undefined });
      const brandFilms = offerOf(c)?.filming_by === "brand";
      get().notify(brandFilms ? c.brand_id : c.creator_id, "🔄 Révision demandée", feedback, "warning");
      return { ok: true };
    },
    submitPublication: (collabId, url) => {
      if (!/^https?:\/\/\S+\.\S+/.test(url.trim())) return { ok: false, error: "Lien invalide" };
      patchCollab(collabId, { publication_url: url.trim(), status: "publication_submitted" });
      return { ok: true };
    },
    approvePublication: (collabId) => {
      release(collab(collabId)!);
      return { ok: true };
    },
    rateCreator: (collabId, rating, comment) => {
      const c = collab(collabId)!;
      set((s) => {
        const reviews = [{ id: uid(), brand_id: c.brand_id, creator_id: c.creator_id, collaboration_id: c.id, rating, comment, created_at: now() }, ...s.reviews];
        const mine = reviews.filter((r) => r.creator_id === c.creator_id);
        const avg = Math.round((mine.reduce((a, r) => a + r.rating, 0) / mine.length) * 10) / 10;
        return { reviews, profiles: s.profiles.map((p) => (p.user_id === c.creator_id ? { ...p, rating: avg } : p)) };
      });
    },
    toggleFavorite: (creatorId) =>
      set((s) => {
        const has = s.favorites.some((f) => f.brand_id === s.userId && f.creator_id === creatorId);
        return { favorites: has ? s.favorites.filter((f) => !(f.brand_id === s.userId && f.creator_id === creatorId)) : [...s.favorites, { brand_id: s.userId!, creator_id: creatorId }] };
      }),

    sendMessage: (conversationId, content) => {
      const s = get();
      if (!content.trim()) return { ok: false, error: "Message vide" };
      const me = s.profiles.find((p) => p.user_id === s.userId)!;
      const conv = s.conversations.find((c) => c.id === conversationId)!;
      const other = conv.participants.find((p) => p !== me.user_id)!;
      if (s.blocked.some((b) => b.blocker_id === me.user_id && b.blocked_id === other))
        return { ok: false, error: "Vous avez bloqué cet utilisateur. Débloquez-le pour envoyer un message." };
      if (me.role === "creator" && !me.identity_verified) return { ok: false, error: "Vous devez vérifier votre identité pour envoyer des messages." };
      if (me.role === "brand" && !me.email_verified) return { ok: false, error: "Vous devez vérifier votre email pour envoyer des messages." };
      systemMsg(conversationId, me.user_id, content.trim());
      return { ok: true };
    },
    markConversationRead: (conversationId) =>
      set((s) => ({ messages: s.messages.map((m) => (m.conversation_id === conversationId && m.sender_id !== s.userId && !m.read_at ? { ...m, read_at: now() } : m)) })),
    blockUser: (id) => {
      const s = get();
      if (s.blocked.some((b) => b.blocker_id === s.userId && b.blocked_id === id)) return { ok: false, error: "Cet utilisateur est déjà bloqué" };
      set({ blocked: [...s.blocked, { blocker_id: s.userId!, blocked_id: id }] });
      return { ok: true };
    },
    report: (r) => set((s) => ({ reports: [{ ...r, id: uid(), reporter_id: s.userId!, status: "pending", created_at: now() }, ...s.reports] })),

    requestWithdrawal: (w) => {
      const s = get();
      const wallet = s.wallets.find((x) => x.user_id === s.userId)!;
      if (w.amount < WITHDRAW_MIN[w.method]) return { ok: false, error: `Montant minimum : ${fcfa(WITHDRAW_MIN[w.method])}` };
      if (w.amount > wallet.balance) return { ok: false, error: "Solde insuffisant" };
      const id = uid();
      set((st) => ({
        withdrawals: [{ ...w, id, user_id: st.userId!, status: "pending", created_at: now() }, ...st.withdrawals],
        wallets: st.wallets.map((x) => (x.user_id === st.userId ? { ...x, balance: x.balance - w.amount, pending_balance: x.pending_balance + w.amount } : x)),
        transactions: [{ id: uid(), user_id: st.userId!, type: "withdrawal", amount: -w.amount, status: "pending", label: "Retrait en cours", collaboration_id: id, created_at: now() }, ...st.transactions],
      }));
      return { ok: true, id };
    },

    addPortfolio: (p) => set((s) => ({ portfolio: [{ ...p, id: uid(), user_id: s.userId! }, ...s.portfolio] })),
    removePortfolio: (id) => set((s) => ({ portfolio: s.portfolio.filter((p) => p.id !== id) })),

    notify: (user_id, title, message, type = "info") =>
      set((s) => ({ notifications: [{ id: uid(), user_id, title, message, type, is_read: false, created_at: now() }, ...s.notifications] })),
    markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)) })),
    markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => (n.user_id === s.userId ? { ...n, is_read: true } : n)) })),

    adminSetBan: (userId, banned, reason) => {
      set((s) => ({ profiles: s.profiles.map((p) => (p.user_id === userId ? { ...p, is_banned: banned, ban_reason: banned ? reason : undefined } : p)) }));
      log(banned ? "ban" : "unban", userId, { reason });
    },
    adminReviewIdentity: (userId, approve, reason) => {
      set((s) => ({
        profiles: s.profiles.map((p) =>
          p.user_id === userId ? (approve ? { ...p, identity_verified: true } : { ...p, identity_submitted_at: undefined, identity_method: undefined }) : p,
        ),
      }));
      get().notify(userId, approve ? "Identité vérifiée ✅" : "Vérification refusée", approve ? "Votre identité a été vérifiée." : `Motif : ${reason}`, approve ? "success" : "error");
      log(approve ? "identity_approved" : "identity_rejected", userId, { reason });
    },
    adminReviewSocial: (id, approve, notes) => {
      const v = get().socialVerifications.find((x) => x.id === id)!;
      set((s) => ({
        socialVerifications: s.socialVerifications.map((x) => (x.id === id ? { ...x, status: approve ? "verified" : "rejected", admin_notes: notes } : x)),
        profiles: approve ? s.profiles.map((p) => (p.user_id === v.user_id ? { ...p, followers: { ...p.followers, [v.platform]: v.ai_extracted_followers ?? v.claimed_followers } } : p)) : s.profiles,
      }));
      get().notify(v.user_id, approve ? "Réseau social vérifié ✅" : "Vérification refusée ❌", v.platform, approve ? "success" : "error");
      log(approve ? "social_verification_approved" : "social_verification_rejected", v.user_id);
    },
    adminReviewReport: (id, action, notes) => {
      const r = get().reports.find((x) => x.id === id)!;
      set((s) => ({ reports: s.reports.map((x) => (x.id === id ? { ...x, status: action === "dismiss" ? "dismissed" : "resolved", admin_notes: notes } : x)) }));
      if (action === "ban" && r.target_user_id) {
        get().adminSetBan(r.target_user_id, true, notes || "Compte banni suite à un signalement");
        get().notify(r.target_user_id, "Compte suspendu", notes || "Compte banni suite à un signalement", "error");
      }
      log(`report_${action}`, r.target_user_id, { report_id: id, notes });
    },
    adminFinalizeWithdrawal: (id) => {
      const w = get().withdrawals.find((x) => x.id === id)!;
      set((s) => ({
        withdrawals: s.withdrawals.map((x) => (x.id === id ? { ...x, status: "completed", proof_url: "preuve.jpg" } : x)),
        wallets: s.wallets.map((x) => (x.user_id === w.user_id ? { ...x, pending_balance: Math.max(0, x.pending_balance - w.amount) } : x)),
        transactions: s.transactions.map((t) => (t.collaboration_id === id && t.type === "withdrawal" ? { ...t, status: "completed", label: "Retrait effectué" } : t)),
      }));
      get().notify(w.user_id, "✅ Retrait effectué !", fcfa(w.amount), "success");
      log("withdrawal_completed", w.user_id, { withdrawal_id: id, amount: w.amount });
    },
    adminRejectWithdrawal: (id, reason) => {
      const w = get().withdrawals.find((x) => x.id === id)!;
      set((s) => ({
        withdrawals: s.withdrawals.map((x) => (x.id === id ? { ...x, status: "rejected", rejection_reason: reason } : x)),
        wallets: s.wallets.map((x) => (x.user_id === w.user_id ? { ...x, balance: x.balance + w.amount, pending_balance: Math.max(0, x.pending_balance - w.amount) } : x)),
        transactions: s.transactions.map((t) => (t.collaboration_id === id && t.type === "withdrawal" ? { ...t, status: "cancelled", label: "Retrait annulé" } : t)),
      }));
      get().notify(w.user_id, "❌ Retrait refusé", reason, "error");
      log("withdrawal_rejected", w.user_id, { withdrawal_id: id, reason });
    },
    adminBroadcast: (target, title, message, type) => {
      const ids = get().profiles.filter((p) => p.role !== "admin" && (target === "all" || p.role === target)).map((p) => p.user_id);
      ids.forEach((id) => get().notify(id, title, message, type));
      log("broadcast_notification", undefined, { target, count: ids.length });
      return ids.length;
    },
    adminSetInviteRequired: (v) => {
      set({ inviteRequired: v });
      log("invite_codes_required", undefined, { value: v });
    },
    adminGenerateCodes: (n, note) => {
      const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const codes = Array.from({ length: n }, () => `COLLAB-${Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join("")}`);
      set((s) => ({ inviteCodes: [...codes.map((code) => ({ code, is_active: true, note })), ...s.inviteCodes] }));
      log("invite_codes_generated", undefined, { count: n, note });
      return codes;
    },
    adminToggleCode: (code) => set((s) => ({ inviteCodes: s.inviteCodes.map((c) => (c.code === code ? { ...c, is_active: !c.is_active } : c)) })),
    adminDeleteCode: (code) => set((s) => ({ inviteCodes: s.inviteCodes.filter((c) => c.code !== code) })),
    adminUpdateLegal: (slug, title, content) => {
      set((s) => ({ legalPages: s.legalPages.map((p) => (p.slug === slug ? { ...p, title, content } : p)) }));
      log("legal_page_updated", undefined, { slug });
    },
    adminSaveTemplate: ({ id, ...t }) =>
      set((s) => ({ templates: id ? s.templates.map((x) => (x.id === id ? { ...x, ...t } : x)) : [{ ...t, id: uid() }, ...s.templates] })),
    adminDeleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
  };
});

// ---------- sélecteurs ----------
export const useMe = () => useDB((s) => s.profiles.find((p) => p.user_id === s.userId));
export const displayName = (p?: Profile) => (p ? (p.role === "brand" ? p.company_name || p.full_name : p.full_name) : "");
export const profileOf = (id: string) => useDB.getState().profiles.find((p) => p.user_id === id);
