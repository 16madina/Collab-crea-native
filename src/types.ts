// Types alignés sur les tables Supabase de la version web (voir docs/spec).

export type Role = "creator" | "brand" | "admin";

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "snapchat" | "facebook";

export type PricingItem = { type: string; price: number; description?: string };

export type Profile = {
  user_id: string;
  role: Role;
  full_name: string;
  avatar_url: string | number; // URL ou image embarquée (require)
  banner_url?: string | number;
  logo_url?: string;
  bio?: string;
  category?: string;
  tags?: string[]; // spécialités secondaires
  country?: string;
  residence_country?: string;
  // marque
  company_name?: string;
  sector?: string;
  website?: string;
  company_description?: string;
  brand_prefs?: { collaboration_types: string[]; target_categories: string[] };
  // créateur
  pricing?: { currency: "XOF" | "EUR" | "USD"; items: PricingItem[] };
  followers: Partial<Record<SocialPlatform, string>>;
  // vérification
  email_verified: boolean;
  identity_verified: boolean;
  identity_submitted_at?: string;
  identity_method?: "document" | "selfie";
  // modération
  is_banned?: boolean;
  ban_reason?: string;
  rating?: number;
};

export type OfferStatus = "active" | "draft" | "closed" | "expired";

export type Slot = { date: string; start_time: string; end_time: string };

export type Offer = {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  expectations?: string;
  restrictions?: string;
  category: string;
  content_types: string[];
  budget_min: number;
  budget_max: number;
  deadline?: string; // ISO
  location?: string; // pays cibles joints par ", "
  delivery_mode: "private" | "network";
  presence_mode: "remote" | "on_site";
  filming_by: "creator" | "brand";
  on_site_city?: string;
  on_site_neighborhood?: string;
  on_site_store_name?: string;
  on_site_slots: Slot[];
  creative_brief: { phone?: string; address?: string; hashtags?: string; mentions?: string };
  images: string[];
  status: OfferStatus;
  created_at: string;
};

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type Application = {
  id: string;
  offer_id: string;
  creator_id: string;
  message?: string;
  selected_slot?: Slot;
  status: ApplicationStatus;
  conversation_id: string;
  created_at: string;
};

export type CollabStatus =
  | "pending_payment"
  | "in_progress"
  | "content_submitted"
  | "in_review"
  | "revision_requested"
  | "pending_publication"
  | "publication_submitted"
  | "completed"
  | "refunded"
  | "expired"
  | "refused"
  | "cancelled";

export const ACTIVE_COLLAB: CollabStatus[] = [
  "pending_payment",
  "in_progress",
  "content_submitted",
  "in_review",
  "revision_requested",
  "pending_publication",
  "publication_submitted",
];

export const COLLAB_LABEL: Record<CollabStatus, string> = {
  pending_payment: "En attente de paiement",
  in_progress: "En cours",
  content_submitted: "Contenu prêt 🔒",
  in_review: "En revue",
  revision_requested: "Modification demandée",
  pending_publication: "📱 À publier",
  publication_submitted: "🔗 Lien soumis",
  completed: "Terminé",
  refunded: "Remboursé",
  expired: "Expiré",
  refused: "Refusé",
  cancelled: "Annulé",
};

export type Collaboration = {
  id: string;
  offer_id: string;
  brand_id: string;
  creator_id: string;
  conversation_id: string;
  agreed_amount: number;
  creator_amount: number;
  platform_fee: number;
  status: CollabStatus;
  deadline: string;
  content_urls: string[];
  content_description?: string;
  content_submitted_at?: string;
  auto_approve_at?: string;
  brand_feedback?: string;
  publication_url?: string;
  preview_viewed_at?: string;
  paid: boolean; // séquestre versé
  payout_status?: "pending" | "completed" | "failed";
  created_at: string;
};

export type Conversation = {
  id: string;
  created_by: string;
  participants: [string, string];
  offer_id?: string;
  application_id?: string;
  subject: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string;
  created_at: string;
};

export type NotificationType = "info" | "success" | "warning" | "error" | "promotion" | "proposal" | "payment";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export type TxType = "release" | "withdrawal" | "deposit" | "refund" | "escrow";
export type TxStatus = "pending" | "completed" | "failed" | "cancelled";

export type Transaction = {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  status: TxStatus;
  label: string;
  collaboration_id?: string;
  created_at: string;
};

export type Wallet = { user_id: string; balance: number; pending_balance: number };

export type WithdrawalStatus = "pending" | "approved" | "processing" | "completed" | "rejected";

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  method: "mobile_money" | "paypal" | "bank";
  mobile_provider?: string;
  mobile_number?: string;
  paypal_email?: string;
  payout_currency?: "EUR" | "USD";
  status: WithdrawalStatus;
  rejection_reason?: string;
  proof_url?: string;
  created_at: string;
};

export type PortfolioItem = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  media_type: "image" | "video";
  media_url: string | number;
  platform?: string;
  views_count?: number;
};

export type SocialVerification = {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  page_name: string;
  claimed_followers: string;
  screenshot_url?: string;
  ai_extracted_name?: string;
  ai_extracted_followers?: string;
  ai_confidence?: number;
  status: "pending_admin" | "verified" | "rejected";
  admin_notes?: string;
  created_at: string;
};

export type ReportType = "user" | "offer" | "fraud";
export type Report = {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  target_user_id?: string;
  target_offer_id?: string;
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  admin_notes?: string;
  created_at: string;
};

export type InviteCode = { code: string; is_active: boolean; note?: string; used_by?: string; used_at?: string };

export type LegalPage = { slug: string; title: string; content: string };

export type NotificationTemplate = { id: string; name: string; title: string; message: string; type: NotificationType };
