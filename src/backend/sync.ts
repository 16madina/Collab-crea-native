// Synchronisation store ⇄ Supabase.
// - Lecture : chargement de toutes les tables visibles (RLS) puis temps réel.
// - Écriture : chaque modification locale d'une « tranche » synchronisée est comparée à l'état
//   précédent et envoyée (insert / update / delete). Les opérations d'argent passent par des RPC.
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  Application,
  AppNotification,
  Collaboration,
  Conversation,
  InviteCode,
  LegalPage,
  Message,
  NotificationTemplate,
  Offer,
  PortfolioItem,
  Profile,
  Report,
  Role,
  SocialPlatform,
  SocialVerification,
  Transaction,
  Wallet,
  Withdrawal,
} from "../types";
import { errMsg, supabase } from "./supabase";

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const opt = <T>(v: T | null | undefined) => (v === null ? undefined : v);
const toDate = (iso?: string) => (iso ? iso.slice(0, 10) : null);
const fromDate = (d: unknown) =>
  typeof d === "string"
    ? d.length === 10
      ? `${d}T23:59:00.000Z`
      : d
    : undefined;
const PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "snapchat",
  "facebook",
];

// ─────────────────────────── Correspondances ───────────────────────────
export const map = {
  profile: {
    from: (r: Row, role: Role): Profile => {
      const pricing = r.pricing as
        | Profile["pricing"]
        | Profile["pricing"][]
        | null;
      return {
        user_id: r.user_id as string,
        role,
        full_name: (r.full_name as string) ?? "",
        avatar_url: (r.avatar_url as string) ?? "",
        banner_url: opt(r.banner_url as string),
        logo_url: opt(r.logo_url as string),
        bio: opt(r.bio as string),
        category: opt(r.category as string),
        tags: (r.tags as string[]) ?? [],
        country: opt(r.country as string),
        residence_country: opt(r.residence_country as string),
        company_name: opt(r.company_name as string),
        sector: opt(r.sector as string),
        website: opt(r.website as string),
        company_description: opt(r.company_description as string),
        brand_prefs: opt(r.brand_prefs as Profile["brand_prefs"]),
        pricing: Array.isArray(pricing)
          ? { currency: "XOF", items: pricing as never }
          : (pricing ?? undefined),
        followers: Object.fromEntries(
          PLATFORMS.map((p) => [p, r[`${p}_followers`]]).filter(([, v]) => v),
        ) as Profile["followers"],
        email_verified: !!r.email_verified,
        identity_verified: !!r.identity_verified,
        identity_submitted_at: opt(r.identity_submitted_at as string),
        identity_method: opt(r.identity_method as Profile["identity_method"]),
        identity_document_url: opt(r.identity_document_url as string),
        selfie_url: opt(r.selfie_url as string),
        is_banned: !!r.is_banned,
        ban_reason: opt(r.ban_reason as string),
        rating: r.rating == null ? undefined : Number(r.rating),
      };
    },
    to: (p: Profile): Row => ({
      user_id: p.user_id,
      full_name: p.full_name,
      avatar_url: str(p.avatar_url),
      banner_url: str(p.banner_url),
      logo_url: str(p.logo_url),
      bio: p.bio ?? null,
      category: p.category ?? null,
      tags: p.tags ?? [],
      country: p.country ?? null,
      residence_country: p.residence_country ?? null,
      company_name: p.company_name ?? null,
      sector: p.sector ?? null,
      website: p.website ?? null,
      company_description: p.company_description ?? null,
      brand_prefs: p.brand_prefs ?? null,
      pricing: p.pricing ?? null,
      ...Object.fromEntries(
        PLATFORMS.map((k) => [`${k}_followers`, p.followers?.[k] ?? null]),
      ),
      email_verified: p.email_verified,
      identity_verified: p.identity_verified,
      identity_submitted_at: p.identity_submitted_at ?? null,
      identity_method: p.identity_method ?? null,
      is_banned: !!p.is_banned,
      ban_reason: p.ban_reason ?? null,
    }),
  },
  offer: {
    from: (r: Row): Offer => ({
      id: r.id as string,
      brand_id: r.brand_id as string,
      title: r.title as string,
      description: r.description as string,
      expectations: opt(r.expectations as string),
      restrictions: opt(r.restrictions as string),
      category: r.category as string,
      content_types: (r.content_types as string[])?.length
        ? (r.content_types as string[])
        : r.content_type
          ? [r.content_type as string]
          : [],
      budget_min: r.budget_min as number,
      budget_max: r.budget_max as number,
      deadline: fromDate(r.deadline),
      logo_url: opt(r.logo_url as string),
      location: opt(r.location as string),
      delivery_mode: r.delivery_mode as Offer["delivery_mode"],
      presence_mode: r.presence_mode as Offer["presence_mode"],
      filming_by: r.filming_by as Offer["filming_by"],
      on_site_city: opt(r.on_site_city as string),
      on_site_neighborhood: opt(r.on_site_neighborhood as string),
      on_site_store_name: opt(r.on_site_store_name as string),
      on_site_slots: (r.on_site_slots as Offer["on_site_slots"]) ?? [],
      creative_brief: (r.creative_brief as Offer["creative_brief"]) ?? {},
      images: (r.images as string[]) ?? [],
      deliverables: (r.deliverables as string[]) ?? [],
      criteria: (r.criteria as string[]) ?? [],
      status: r.status as Offer["status"],
      created_at: r.created_at as string,
    }),
    to: (o: Offer): Row => ({
      id: o.id,
      brand_id: o.brand_id,
      title: o.title,
      description: o.description,
      expectations: o.expectations ?? null,
      restrictions: o.restrictions ?? null,
      category: o.category,
      content_type: o.content_types[0] ?? "",
      content_types: o.content_types,
      budget_min: o.budget_min,
      budget_max: o.budget_max,
      deadline: toDate(o.deadline),
      logo_url: str(o.logo_url),
      location: o.location ?? null,
      delivery_mode: o.delivery_mode,
      presence_mode: o.presence_mode,
      filming_by: o.filming_by,
      on_site_city: o.on_site_city ?? null,
      on_site_neighborhood: o.on_site_neighborhood ?? null,
      on_site_store_name: o.on_site_store_name ?? null,
      on_site_slots: o.on_site_slots,
      creative_brief: o.creative_brief,
      images: o.images.filter((x): x is string => typeof x === "string"),
      deliverables: o.deliverables ?? [],
      criteria: o.criteria ?? [],
      status: o.status,
    }),
  },
  application: {
    from: (r: Row): Application => ({
      id: r.id as string,
      offer_id: r.offer_id as string,
      creator_id: r.creator_id as string,
      message: opt(r.message as string),
      selected_slot: opt(r.selected_slot as Application["selected_slot"]),
      notes: opt(r.notes as string),
      status: r.status as Application["status"],
      conversation_id: (r.conversation_id as string) ?? "",
      created_at: r.created_at as string,
    }),
    to: (a: Application): Row => ({
      id: a.id,
      offer_id: a.offer_id,
      creator_id: a.creator_id,
      message: a.message ?? null,
      selected_slot: a.selected_slot ?? null,
      notes: a.notes ?? null,
      status: a.status,
      conversation_id: a.conversation_id || null,
    }),
  },
  collaboration: {
    from: (r: Row): Collaboration => ({
      id: r.id as string,
      offer_id: r.offer_id as string,
      brand_id: r.brand_id as string,
      creator_id: r.creator_id as string,
      conversation_id: (r.conversation_id as string) ?? "",
      agreed_amount: r.agreed_amount as number,
      creator_amount: r.creator_amount as number,
      platform_fee: r.platform_fee as number,
      status: r.status as Collaboration["status"],
      deadline: fromDate(r.deadline) ?? "",
      content_urls: (r.content_urls as string[])?.length
        ? (r.content_urls as string[])
        : r.content_url
          ? [r.content_url as string]
          : [],
      content_description: opt(r.content_description as string),
      content_submitted_at: opt(r.content_submitted_at as string),
      auto_approve_at: opt(r.auto_approve_at as string),
      brand_feedback: opt(r.brand_feedback as string),
      publication_url: opt(r.publication_url as string),
      preview_viewed_at: opt(r.preview_viewed_at as string),
      paid: !!r.paid,
      payout_status: opt(r.payout_status as Collaboration["payout_status"]),
      created_at: r.created_at as string,
    }),
    // Les montants, « paid » et « payout_status » sont gérés par le serveur (trigger + RPC).
    to: (c: Collaboration): Row => ({
      id: c.id,
      offer_id: c.offer_id,
      brand_id: c.brand_id,
      creator_id: c.creator_id,
      conversation_id: c.conversation_id || null,
      agreed_amount: c.agreed_amount,
      status: c.status,
      deadline:
        toDate(c.deadline) ??
        toDate(new Date(Date.now() + 14 * 864e5).toISOString()),
      content_urls: c.content_urls,
      content_url: c.content_urls[0] ?? null,
      content_description: c.content_description ?? null,
      content_submitted_at: c.content_submitted_at ?? null,
      auto_approve_at: c.auto_approve_at ?? null,
      brand_feedback: c.brand_feedback ?? null,
      publication_url: c.publication_url ?? null,
      preview_viewed_at: c.preview_viewed_at ?? null,
    }),
  },
  message: {
    from: (r: Row): Message => ({
      id: r.id as string,
      conversation_id: r.conversation_id as string,
      sender_id: r.sender_id as string,
      content: r.content as string,
      read_at: opt(r.read_at as string),
      created_at: r.created_at as string,
    }),
    to: (m: Message): Row => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      read_at: m.read_at ?? null,
    }),
  },
  notification: {
    from: (r: Row): AppNotification => ({
      id: r.id as string,
      user_id: r.user_id as string,
      title: r.title as string,
      message: r.message as string,
      type: r.type as AppNotification["type"],
      is_read: !!r.is_read,
      created_at: r.created_at as string,
    }),
  },
  portfolio: {
    from: (r: Row): PortfolioItem => ({
      id: r.id as string,
      user_id: r.user_id as string,
      title: r.title as string,
      description: opt(r.description as string),
      media_type: r.media_type as PortfolioItem["media_type"],
      media_url: r.media_url as string,
      platform: opt(r.platform as string),
      views_count: opt(r.views_count as number),
    }),
    to: (p: PortfolioItem): Row => ({
      id: p.id,
      user_id: p.user_id,
      title: p.title,
      description: p.description ?? null,
      media_type: p.media_type,
      media_url: str(p.media_url) ?? "",
      platform: p.platform ?? null,
      views_count: p.views_count ?? 0,
    }),
  },
  social: {
    from: (r: Row): SocialVerification => ({
      id: r.id as string,
      user_id: r.user_id as string,
      platform: r.platform as SocialPlatform,
      page_name: r.page_name as string,
      claimed_followers: r.claimed_followers as string,
      screenshot_url: opt(r.screenshot_url as string),
      ai_extracted_name: opt(r.ai_extracted_name as string),
      ai_extracted_followers: opt(r.ai_extracted_followers as string),
      ai_confidence:
        r.ai_confidence == null ? undefined : Number(r.ai_confidence),
      status: (r.status === "pending_ai"
        ? "pending_admin"
        : r.status) as SocialVerification["status"],
      admin_notes: opt(r.admin_notes as string),
      created_at: r.created_at as string,
    }),
    to: (v: SocialVerification): Row => ({
      id: v.id,
      user_id: v.user_id,
      platform: v.platform,
      page_name: v.page_name,
      claimed_followers: v.claimed_followers,
      screenshot_url: v.screenshot_url ?? "",
      status: v.status,
      admin_notes: v.admin_notes ?? null,
    }),
  },
  report: {
    from: (r: Row): Report => ({
      id: r.id as string,
      reporter_id: r.reporter_id as string,
      report_type: r.report_type as Report["report_type"],
      target_user_id: opt(r.target_user_id as string),
      target_offer_id: opt(r.target_offer_id as string),
      reason: r.reason as string,
      description: opt(r.description as string),
      status: r.status as Report["status"],
      admin_notes: opt(r.admin_notes as string),
      created_at: r.created_at as string,
    }),
    to: (r: Report): Row => ({
      id: r.id,
      reporter_id: r.reporter_id,
      report_type: r.report_type,
      target_user_id: r.target_user_id ?? null,
      target_offer_id: r.target_offer_id ?? null,
      reason: r.reason,
      description: r.description ?? null,
      status: r.status,
      admin_notes: r.admin_notes ?? null,
    }),
  },
  transaction: {
    from: (r: Row): Transaction => ({
      id: r.id as string,
      user_id: r.user_id as string,
      type: r.type as Transaction["type"],
      amount: r.amount as number,
      status: r.status as Transaction["status"],
      label: (r.description as string) ?? "",
      collaboration_id: opt(r.collaboration_id as string),
      created_at: r.created_at as string,
    }),
  },
  wallet: {
    from: (r: Row): Wallet => ({
      user_id: r.user_id as string,
      balance: r.balance as number,
      pending_balance: r.pending_balance as number,
    }),
  },
  withdrawal: {
    from: (r: Row): Withdrawal => ({
      id: r.id as string,
      user_id: r.user_id as string,
      amount: r.amount as number,
      method: r.method as Withdrawal["method"],
      mobile_provider: opt(r.mobile_provider as string),
      mobile_number: opt(r.mobile_number as string),
      paypal_email: opt(r.paypal_email as string),
      payout_currency: opt(r.payout_currency as Withdrawal["payout_currency"]),
      status: r.status as Withdrawal["status"],
      rejection_reason: opt(r.rejection_reason as string),
      proof_url: opt(r.proof_url as string),
      created_at: r.created_at as string,
    }),
  },
};

// ─────────────────────────── Chargement ───────────────────────────
type Store = {
  getState: () => Record<string, unknown> & { userId: string | null };
  setState: (p: Record<string, unknown>) => void;
  subscribe: (
    fn: (s: Record<string, unknown>, prev: Record<string, unknown>) => void,
  ) => () => void;
};

let applyingServer = false;
const all = async <T>(q: PromiseLike<{ data: T[] | null; error: unknown }>) => {
  const { data, error } = await q;
  if (error) console.warn("[sync]", errMsg(error));
  return data ?? [];
};

export async function loadAll(store: Store, uid: string) {
  const [
    profiles,
    roles,
    offers,
    apps,
    collabs,
    convs,
    parts,
    msgs,
    notifs,
    wallets,
    txs,
    wds,
    portfolio,
    socials,
    reports,
    blocked,
    favs,
    follows,
    offerFavs,
    archives,
    reviews,
    codes,
    legal,
    templates,
    settings,
    logs,
  ] = await Promise.all([
    all(supabase.from("profiles").select("*")),
    all(supabase.from("user_roles").select("user_id, role")),
    all(
      supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("collaborations")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false }),
    ),
    all(
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id"),
    ),
    all(
      supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(5000),
    ),
    all(
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    all(supabase.from("wallets").select("*")),
    all(
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("portfolio_items")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("social_verifications")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(supabase.from("blocked_users").select("blocker_id, blocked_id")),
    all(supabase.from("favorites").select("brand_id, creator_id")),
    all(
      supabase
        .from("follows")
        .select("follower_id, followed_id")
        .eq("follower_id", uid),
    ),
    all(supabase.from("offer_favorites").select("offer_id").eq("user_id", uid)),
    all(
      supabase
        .from("conversation_archives")
        .select("conversation_id")
        .eq("user_id", uid),
    ),
    all(
      supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(
      supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    all(supabase.from("legal_pages").select("slug, title, content")),
    all(supabase.from("notification_templates").select("*")),
    all(supabase.from("app_settings").select("key, value")),
    all(
      supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ),
  ]);

  const roleOf = new Map<string, Role>();
  for (const r of roles as Row[]) {
    const prev = roleOf.get(r.user_id as string);
    if (prev !== "admin") roleOf.set(r.user_id as string, r.role as Role);
  }
  const partsBy = new Map<string, string[]>();
  for (const p of parts as Row[])
    partsBy.set(p.conversation_id as string, [
      ...(partsBy.get(p.conversation_id as string) ?? []),
      p.user_id as string,
    ]);

  // Rôles du compte courant : un même compte peut avoir l'espace créateur et l'espace marque.
  const myRoles = (roles as Row[])
    .filter((r) => r.user_id === uid)
    .map((r) => r.role as Role);
  const st = store.getState() as { activeRole?: Role };
  // Espace par défaut : créateur ou marque ; « admin » seulement pour un compte purement administrateur
  // (le panneau admin reste accessible depuis le profil).
  const active: Role | undefined =
    st.activeRole && myRoles.includes(st.activeRole) ? st.activeRole : (myRoles.find((r) => r !== "admin") ?? myRoles[0]);
  if (active) roleOf.set(uid, active);

  applyingServer = true;
  store.setState({
    myRoles,
    activeRole: active,
    linked:
      myRoles.includes("creator") && myRoles.includes("brand")
        ? { [uid]: uid }
        : {},
    profiles: (profiles as Row[]).map((r) =>
      map.profile.from(r, roleOf.get(r.user_id as string) ?? "brand"),
    ),
    offers: (offers as Row[]).map(map.offer.from),
    applications: (apps as Row[]).map(map.application.from),
    collaborations: (collabs as Row[]).map(map.collaboration.from),
    conversations: (convs as Row[]).map((c): Conversation => {
      const ps = partsBy.get(c.id as string) ?? [c.created_by as string];
      const other = ps.find((x) => x !== c.created_by) ?? ps[0];
      return {
        id: c.id as string,
        created_by: c.created_by as string,
        participants: [c.created_by as string, other],
        offer_id: opt(c.offer_id as string),
        subject: (c.subject as string) ?? "",
        updated_at: c.updated_at as string,
      };
    }),
    messages: (msgs as Row[]).map(map.message.from),
    notifications: (notifs as Row[]).map(map.notification.from),
    wallets: (wallets as Row[]).map(map.wallet.from),
    transactions: (txs as Row[]).map(map.transaction.from),
    withdrawals: (wds as Row[]).map(map.withdrawal.from),
    portfolio: (portfolio as Row[]).map(map.portfolio.from),
    socialVerifications: (socials as Row[]).map(map.social.from),
    reports: (reports as Row[]).map(map.report.from),
    blocked: blocked as { blocker_id: string; blocked_id: string }[],
    favorites: favs as { brand_id: string; creator_id: string }[],
    follows: (follows as Row[]).map((f) => f.followed_id as string),
    offerFavs: (offerFavs as Row[]).map((f) => `${uid}:${f.offer_id}`),
    archived: (archives as Row[]).map((a) => a.conversation_id as string),
    reviews: reviews,
    inviteCodes: (codes as Row[]).map(
      (c): InviteCode => ({
        code: c.code as string,
        is_active: !!c.is_active,
        note: opt(c.note as string),
        used_by: opt(c.used_by as string),
        used_at: opt(c.used_at as string),
      }),
    ),
    legalPages: legal as LegalPage[],
    templates: templates as NotificationTemplate[],
    inviteRequired: (settings as Row[]).some(
      (s) => s.key === "invite_codes_required" && String(s.value) === "true",
    ),
    adminLogs: logs,
  });
  applyingServer = false;
}

// ─────────────────────────── Écriture (diff) ───────────────────────────
type Ent = { id: string };
const byId = <T extends Ent>(l: T[]) => new Map(l.map((x) => [x.id, x]));
function diff<T extends Ent>(prev: T[], next: T[]) {
  const p = byId(prev);
  const n = byId(next);
  const added: T[] = [];
  const changed: T[] = [];
  const removed: string[] = [];
  for (const [id, x] of n) {
    const old = p.get(id);
    if (!old) added.push(x);
    else if (old !== x) changed.push(x);
  }
  for (const id of p.keys()) if (!n.has(id)) removed.push(id);
  return { added, changed, removed };
}
const setDiff = (prev: string[], next: string[]) => ({
  added: next.filter((x) => !prev.includes(x)),
  removed: prev.filter((x) => !next.includes(x)),
});

let queue: Promise<unknown> = Promise.resolve();
let onError: (msg: string) => void = () => {};
const run = (label: string, fn: () => PromiseLike<{ error: unknown }>) => {
  queue = queue.then(async () => {
    const { error } = await fn();
    if (error) {
      console.warn(`[sync] ${label}`, error);
      onError(errMsg(error));
    }
  });
  return queue;
};

function push(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  me: string,
) {
  const d = <T extends Ent>(k: string) => diff(prev[k] as T[], next[k] as T[]);

  // Profils : mises à jour uniquement (la création se fait à l'inscription).
  if (prev.profiles !== next.profiles) {
    const old = new Map(
      (prev.profiles as Profile[]).map((p) => [p.user_id, p]),
    );
    for (const p of next.profiles as Profile[]) {
      const o = old.get(p.user_id);
      if (o && o !== p) {
        const row = map.profile.to(p);
        run("profile", () =>
          supabase.from("profiles").update(row).eq("user_id", p.user_id),
        );
      }
    }
  }

  const simple = <T extends Ent>(
    key: string,
    table: string,
    to: (x: T) => Row,
    ops: { insert?: boolean; update?: boolean; del?: boolean } = {
      insert: true,
      update: true,
      del: true,
    },
  ) => {
    if (prev[key] === next[key]) return;
    const { added, changed, removed } = d<T>(key);
    if (ops.insert)
      for (const x of added)
        run(`${table}+`, () => supabase.from(table).insert(to(x)));
    if (ops.update)
      for (const x of changed)
        run(`${table}~`, () =>
          supabase.from(table).update(to(x)).eq("id", x.id),
        );
    if (ops.del)
      for (const id of removed)
        run(`${table}-`, () => supabase.from(table).delete().eq("id", id));
  };

  simple<Offer>("offers", "offers", map.offer.to);

  // Conversations : la conversation puis ses deux participants.
  if (prev.conversations !== next.conversations) {
    const { added } = d<Conversation>("conversations");
    for (const c of added) {
      run("conversation", () =>
        supabase
          .from("conversations")
          .insert({
            id: c.id,
            created_by: c.created_by,
            subject: c.subject,
            offer_id: c.offer_id ?? null,
          }),
      );
      run("participants", () =>
        supabase
          .from("conversation_participants")
          .insert(
            c.participants.map((user_id) => ({
              conversation_id: c.id,
              user_id,
            })),
          ),
      );
    }
  }

  simple<Application>("applications", "applications", map.application.to, {
    insert: true,
    update: true,
  });
  simple<Collaboration>(
    "collaborations",
    "collaborations",
    map.collaboration.to,
    { insert: true, update: true },
  );
  simple<Message>("messages", "messages", map.message.to, {
    insert: true,
    update: true,
  });
  // Notifications : création côté serveur (RPC notify_user) ; ici seulement « lue ».
  simple<AppNotification>(
    "notifications",
    "notifications",
    (n) => ({ is_read: n.is_read }),
    { update: true },
  );
  simple<PortfolioItem>("portfolio", "portfolio_items", map.portfolio.to);
  simple<SocialVerification>(
    "socialVerifications",
    "social_verifications",
    map.social.to,
    { insert: true, update: true },
  );
  simple<Report>("reports", "reports", map.report.to, {
    insert: true,
    update: true,
  });
  simple<{ id: string; slug?: string } & NotificationTemplate>(
    "templates",
    "notification_templates",
    (t) => ({
      id: t.id,
      name: t.name,
      title: t.title,
      message: t.message,
      type: t.type,
    }),
  );

  if (prev.legalPages !== next.legalPages) {
    const { changed, added } = diff(
      (prev.legalPages as LegalPage[]).map((l) => ({ ...l, id: l.slug })),
      (next.legalPages as LegalPage[]).map((l) => ({ ...l, id: l.slug })),
    );
    for (const l of [...added, ...changed])
      run("legal", () =>
        supabase
          .from("legal_pages")
          .upsert(
            {
              slug: l.slug,
              title: l.title,
              content: l.content,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "slug" },
          ),
      );
  }

  if (prev.reviews !== next.reviews) {
    const { added } = d<{
      id: string;
      brand_id: string;
      creator_id: string;
      collaboration_id: string;
      rating: number;
      comment: string;
    }>("reviews");
    for (const r of added)
      run("review", () =>
        supabase
          .from("reviews")
          .insert({
            id: r.id,
            brand_id: r.brand_id,
            creator_id: r.creator_id,
            collaboration_id: r.collaboration_id,
            rating: r.rating,
            comment: r.comment,
          }),
      );
  }

  // Listes de liens (blocages, favoris, abonnements…).
  const pairs = <T>(key: string, k: (x: T) => string) =>
    setDiff((prev[key] as T[]).map(k), (next[key] as T[]).map(k));
  if (prev.blocked !== next.blocked) {
    const { added } = pairs<{ blocker_id: string; blocked_id: string }>(
      "blocked",
      (b) => `${b.blocker_id}|${b.blocked_id}`,
    );
    for (const k of added) {
      const [blocker_id, blocked_id] = k.split("|");
      run("block", () =>
        supabase.from("blocked_users").insert({ blocker_id, blocked_id }),
      );
    }
  }
  if (prev.favorites !== next.favorites) {
    const { added, removed } = pairs<{ brand_id: string; creator_id: string }>(
      "favorites",
      (f) => `${f.brand_id}|${f.creator_id}`,
    );
    for (const k of added) {
      const [brand_id, creator_id] = k.split("|");
      run("fav+", () =>
        supabase.from("favorites").insert({ brand_id, creator_id }),
      );
    }
    for (const k of removed) {
      const [brand_id, creator_id] = k.split("|");
      run("fav-", () =>
        supabase
          .from("favorites")
          .delete()
          .eq("brand_id", brand_id)
          .eq("creator_id", creator_id),
      );
    }
  }
  const idList = (
    key: string,
    table: string,
    col: string,
    ownerCol: string,
    parse: (x: string) => string = (x) => x,
  ) => {
    if (prev[key] === next[key]) return;
    const { added, removed } = setDiff(
      prev[key] as string[],
      next[key] as string[],
    );
    for (const x of added)
      run(`${table}+`, () =>
        supabase
          .from(table)
          .insert({ [ownerCol]: me, [col]: parse(x) } as never),
      );
    for (const x of removed)
      run(`${table}-`, () =>
        supabase.from(table).delete().eq(ownerCol, me).eq(col, parse(x)),
      );
  };
  idList("follows", "follows", "followed_id", "follower_id");
  idList(
    "offerFavs",
    "offer_favorites",
    "offer_id",
    "user_id",
    (x) => x.split(":")[1],
  );
  idList("archived", "conversation_archives", "conversation_id", "user_id");

  if (prev.inviteCodes !== next.inviteCodes) {
    const prevC = new Map(
      (prev.inviteCodes as InviteCode[]).map((c) => [c.code, c]),
    );
    const nextC = new Map(
      (next.inviteCodes as InviteCode[]).map((c) => [c.code, c]),
    );
    for (const [code, c] of nextC) {
      const old = prevC.get(code);
      if (old && old !== c)
        run("invite~", () =>
          supabase
            .from("invite_codes")
            .update({ is_active: c.is_active, note: c.note ?? null })
            .eq("code", code),
        );
    }
    for (const code of prevC.keys())
      if (!nextC.has(code))
        run("invite-", () =>
          supabase.from("invite_codes").delete().eq("code", code),
        );
  }
  if (prev.inviteRequired !== next.inviteRequired)
    run("settings", () =>
      supabase
        .from("app_settings")
        .upsert({
          key: "invite_codes_required",
          value: !!next.inviteRequired,
          updated_at: new Date().toISOString(),
        }),
    );
  if (prev.adminLogs !== next.adminLogs) {
    const { added } = d<{
      id: string;
      action_type: string;
      target_user_id?: string;
      details?: unknown;
    }>("adminLogs");
    for (const l of added)
      run("log", () =>
        supabase
          .from("admin_logs")
          .insert({
            id: l.id,
            admin_id: me,
            action_type: l.action_type,
            target_user_id: l.target_user_id ?? null,
            details: (l.details as object) ?? null,
          }),
      );
  }
}

// ─────────────────────────── Démarrage / temps réel ───────────────────────────
let channel: RealtimeChannel | null = null;
let unsub: (() => void) | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;

export function startSync(
  store: Store,
  uid: string,
  opts: { onError: (m: string) => void },
) {
  stopSync();
  onError = opts.onError;
  const reload = () => {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => void loadAll(store, uid), 400);
  };
  unsub = store.subscribe((s, prev) => {
    if (applyingServer || s.userId !== uid || s.mode !== "live") return;
    push(prev, s, uid);
  });
  channel = supabase.channel(`collab-${uid}`);
  for (const table of [
    "messages",
    "notifications",
    "applications",
    "collaborations",
    "conversations",
    "conversation_participants",
    "offers",
    "wallets",
    "transactions",
    "withdrawal_requests",
    "profiles",
    "reviews",
  ])
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      reload,
    );
  channel.subscribe();
  return loadAll(store, uid);
}

export function stopSync() {
  unsub?.();
  unsub = null;
  if (channel) void supabase.removeChannel(channel);
  channel = null;
}

/** Recharge après une opération serveur (RPC). */
export const refresh = (store: Store) => {
  const uid = store.getState().userId;
  return uid ? loadAll(store, uid) : Promise.resolve();
};
