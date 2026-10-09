// Profil créateur (maquette Noir & Or) : couverture, identité, réseaux, stats et 5 onglets.
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty, fmtDate, toast } from "../../kit";
import { GlossFill, GoldFill, GoldRing, GoldText, goldBorder, goldBorderStrong, goldGlow, luxShadow } from "../../lux";
import { fcfa, useDB } from "../../store";
import { colors, fonts, radius } from "../../theme";
import { ACTIVE_COLLAB, type Profile, type SocialPlatform } from "../../types";
import { Press } from "../../ui";
import { formatFollowers, money, parseFollowers, PLATFORM, platformOfType, SAMPLE_AVATARS, SAMPLE_BANNERS } from "../account/constants";
import { Sheet } from "../account/Sheet";
import { avatarOf, nameOf } from "../collab/common";

const W = Dimensions.get("window").width;
const TILE = Math.floor((W - 32 - 16) / 3);
const PRICE_W = Math.floor((W - 32 - 10) / 2);
type Tab = "portfolio" | "pricing" | "offers" | "reviews" | "security";
const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "portfolio", label: "Portfolio", icon: "play-circle-outline" },
  { key: "pricing", label: "Grille tarifaire", icon: "layers-outline" },
  { key: "offers", label: "Offres", icon: "briefcase-outline" },
  { key: "reviews", label: "Avis", icon: "star-outline" },
  { key: "security", label: "Sécurité", icon: "shield-outline" },
];

function GoldOutlineBtn({ label, icon, onPress, small }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; small?: boolean }) {
  return (
    <Press onPress={onPress} style={[styles.outlineBtn, small && { height: 34, paddingHorizontal: 12 }]} scaleTo={0.95}>
      <Ionicons name={icon} size={small ? 14 : 16} color={colors.ink} />
      <Text style={[styles.outlineText, small && { fontSize: 11 }]}>{label}</Text>
    </Press>
  );
}

function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function SubChips<T extends string>({ items, value, onChange }: { items: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Press key={it.key} onPress={() => onChange(it.key)} style={[styles.subChip, on && [{ borderColor: "transparent" }, goldGlow]]} scaleTo={0.94}>
            {on && <GoldFill style={{ borderRadius: radius.pill }} />}
            <Text style={[styles.subChipText, on && { color: colors.onPrimary, fontWeight: "800" }]}>{it.label}</Text>
            {it.count ? (
              <View style={[styles.count, on && { backgroundColor: "#0B0B0B" }]}>
                <Text style={[styles.countText, on && { color: colors.primaryLight }]}>{it.count}</Text>
              </View>
            ) : null}
          </Press>
        );
      })}
    </ScrollView>
  );
}

// ---------- onglets ----------
function PortfolioTab({ me }: { me: Profile }) {
  const portfolio = useDB((s) => s.portfolio);
  const collaborations = useDB((s) => s.collaborations);
  const offers = useDB((s) => s.offers);
  const [f, setF] = useState<"all" | "video" | "image" | "campaigns">("all");
  const mine = useMemo(() => portfolio.filter((p) => p.user_id === me.user_id), [portfolio, me.user_id]);
  const done = useMemo(
    () => collaborations.filter((c) => c.creator_id === me.user_id && c.status === "completed").map((c) => offers.find((o) => o.id === c.offer_id)).filter(Boolean),
    [collaborations, offers, me.user_id],
  );
  const items = f === "all" ? mine : f === "campaigns" ? [] : mine.filter((p) => p.media_type === f);
  return (
    <View>
      <SectionHead
        title="Portfolio"
        right={
          <Press onPress={() => router.push("/edit/portfolio")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }} scaleTo={0.94}>
            <Text style={styles.link}>Ajouter</Text>
            <View style={styles.plusCircle}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </View>
          </Press>
        }
      />
      <SubChips
        value={f}
        onChange={setF}
        items={[
          { key: "all", label: "Tous" },
          { key: "video", label: "Vidéos" },
          { key: "image", label: "Photos" },
          { key: "campaigns", label: "Campagnes" },
        ]}
      />
      {f === "campaigns" ? (
        done.length === 0 ? (
          <Empty icon="briefcase-outline" title="Aucune campagne terminée" text="Tes collaborations terminées apparaîtront ici." />
        ) : (
          <View style={styles.grid}>
            {done.map((o) => (
              <Press key={o!.id} onPress={() => router.push(`/offer/${o!.id}`)} style={styles.tile} scaleTo={0.96}>
                <Image source={o!.images[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
                <Text style={styles.tileCaption} numberOfLines={2}>
                  {o!.title}
                </Text>
              </Press>
            ))}
          </View>
        )
      ) : items.length === 0 ? (
        <Empty icon="images-outline" title="Rien ici pour l'instant" text="Ajoute tes meilleurs contenus pour convaincre les marques." />
      ) : (
        <View style={styles.grid}>
          {items.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 50).springify()} layout={LinearTransition}>
              <Press onPress={() => router.push("/edit/portfolio")} style={styles.tile} scaleTo={0.96}>
                <Image source={p.media_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
                <View style={styles.views}>
                  <Ionicons name={p.media_type === "video" ? "play-outline" : "eye-outline"} size={15} color={colors.ink} />
                  <Text style={styles.viewsText}>{formatFollowers(p.views_count ?? 0)}</Text>
                </View>
              </Press>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const SERVICE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tiktok: "play-outline",
  instagram: "instagram",
  youtube: "youtube",
  snapchat: "snapchat",
  facebook: "facebook",
  pack: "package-variant-closed",
  other: "camera-outline",
};

function PricingTab({ me }: { me: Profile }) {
  const items = me.pricing?.items ?? [];
  const cur = me.pricing?.currency ?? "XOF";
  return (
    <View>
      <SectionHead
        title="Ma grille tarifaire"
        sub="Mes services et tarifs pour les collaborations."
        right={
          <Press onPress={() => router.push("/edit/pricing")} style={styles.addService} scaleTo={0.94}>
            <Text style={styles.addServiceText}>Ajouter un service</Text>
            <Ionicons name="add" size={16} color={colors.ink} />
          </Press>
        }
      />
      {items.length === 0 ? (
        <Empty icon="pricetags-outline" title="Aucun tarif" text="Définis tes tarifs pour que les marques connaissent tes prix." />
      ) : (
        <View style={[styles.grid, { gap: 10 }]}>
          {items.map((it, i) => {
            const plat = platformOfType(it.type);
            const isStory = it.type.toLowerCase().includes("story");
            return (
              <Animated.View key={`${it.type}-${i}`} entering={FadeInDown.delay(i * 60).springify()}>
                <Press onPress={() => router.push("/edit/pricing")} style={[styles.priceCard, luxShadow]} scaleTo={0.97}>
                  <GlossFill />
                  <LinearGradient colors={["rgba(217,172,101,0.22)", "rgba(217,172,101,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.4, y: 0.8 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.priceIcon}>
                    <MaterialCommunityIcons name={isStory ? "camera-outline" : SERVICE_ICON[plat]} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.priceTitle} numberOfLines={2}>
                      {it.type}
                    </Text>
                    <Text style={styles.priceDesc} numberOfLines={2}>
                      {it.description || (plat === "pack" ? "Offre combinée" : "1 publication")}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <GoldText style={[styles.priceValue, { flexShrink: 1 }]}>{money(it.price, cur)}</GoldText>
                      <View style={{ flex: 1 }} />
                      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </View>
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

type OfferFilter = "received" | "sent" | "active" | "done";
function OffersTab({ me }: { me: Profile }) {
  const conversations = useDB((s) => s.conversations);
  const collaborations = useDB((s) => s.collaborations);
  const applications = useDB((s) => s.applications);
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const [f, setF] = useState<OfferFilter>("received");

  const data = useMemo(() => {
    const hasCollab = (convId: string) => collaborations.some((c) => c.conversation_id === convId);
    const received = conversations
      .filter((c) => c.offer_id && c.created_by !== me.user_id && c.participants.includes(me.user_id) && !hasCollab(c.id))
      .map((c) => ({ id: c.id, offer: offers.find((o) => o.id === c.offer_id), status: "Reçue", date: c.updated_at, to: `/chat/${c.id}` }));
    const sent = applications
      .filter((a) => a.creator_id === me.user_id && a.status === "pending")
      .map((a) => ({ id: a.id, offer: offers.find((o) => o.id === a.offer_id), status: "Envoyée", date: a.created_at, to: `/chat/${a.conversation_id}` }));
    const mine = collaborations.filter((c) => c.creator_id === me.user_id);
    const active = mine
      .filter((c) => ACTIVE_COLLAB.includes(c.status))
      .map((c) => ({ id: c.id, offer: offers.find((o) => o.id === c.offer_id), status: "En cours", date: c.created_at, to: `/collab/${c.id}` }));
    const done = mine
      .filter((c) => !ACTIVE_COLLAB.includes(c.status))
      .map((c) => ({ id: c.id, offer: offers.find((o) => o.id === c.offer_id), status: c.status === "completed" ? "Terminée" : "Clôturée", date: c.created_at, to: `/collab/${c.id}` }));
    return { received, sent, active, done };
  }, [conversations, collaborations, applications, offers, me.user_id]);
  const list = data[f];

  return (
    <View>
      <SectionHead title="Mes offres" sub="Les propositions et collaborations en cours." />
      <SubChips
        value={f}
        onChange={setF}
        items={[
          { key: "received", label: "Reçues", count: data.received.length },
          { key: "sent", label: "Envoyées", count: data.sent.length },
          { key: "active", label: "En cours", count: data.active.length },
          { key: "done", label: "Terminées" },
        ]}
      />
      {list.length === 0 ? (
        <Empty icon="briefcase-outline" title="Rien pour le moment" text="Les offres apparaîtront ici dès qu'une marque te contacte ou que tu postules." />
      ) : (
        <View style={{ gap: 10, paddingHorizontal: 16 }}>
          {list.map((r, i) => {
            const brand = profiles.find((p) => p.user_id === r.offer?.brand_id);
            return (
              <Animated.View key={r.id} entering={FadeInDown.delay(i * 60).springify()}>
                <Press onPress={() => router.push(r.to as never)} style={[styles.offerCard, luxShadow]} scaleTo={0.98}>
                  <GlossFill />
                  <View style={styles.brandLogo}>
                    <Text style={styles.brandMono}>{nameOf(brand).slice(0, 2).toUpperCase()}</Text>
                    <Image source={avatarOf(brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.offerTitle} numberOfLines={1}>
                        {r.offer?.title ?? "Offre"}
                      </Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{r.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.offerSub} numberOfLines={1}>
                      {nameOf(brand)} · {r.offer?.content_types.join(" + ")}
                    </Text>
                    <Text style={styles.offerBudget}>
                      Budget : {r.offer ? (r.offer.budget_min === r.offer.budget_max ? fcfa(r.offer.budget_min) : `${fcfa(r.offer.budget_min)} – ${fcfa(r.offer.budget_max)}`) : "—"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 10 }}>
                    <Text style={styles.offerDate}>{fmtDate(r.date, true)}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ReviewsTab({ me }: { me: Profile }) {
  const reviews = useDB((s) => s.reviews);
  const profiles = useDB((s) => s.profiles);
  const mine = useMemo(() => reviews.filter((r) => r.creator_id === me.user_id), [reviews, me.user_id]);
  return (
    <View>
      <SectionHead title="Avis des marques" sub={mine.length ? `Note moyenne ${me.rating ?? "—"} ★ · ${mine.length} avis` : undefined} />
      {mine.length === 0 ? (
        <Empty icon="star-outline" title="Aucun avis pour le moment" text="Les marques pourront te noter à la fin de chaque collaboration." />
      ) : (
        <View style={{ gap: 10, paddingHorizontal: 16 }}>
          {mine.map((r) => {
            const brand = profiles.find((p) => p.user_id === r.brand_id);
            return (
              <View key={r.id} style={[styles.reviewCard, luxShadow]}>
                <GlossFill />
                <View style={styles.brandLogo}>
                  <Text style={styles.brandMono}>{nameOf(brand).slice(0, 2).toUpperCase()}</Text>
                  <Image source={avatarOf(brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= r.rating ? "star" : "star-outline"} size={16} color={colors.primary} />
                    ))}
                  </View>
                  <Text style={styles.reviewText}>{r.comment}</Text>
                  <Text style={styles.offerDate}>
                    — {nameOf(brand)}, {fmtDate(r.created_at, true)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SecurityTab({ me, onLogout }: { me: Profile; onLogout: () => void }) {
  const wallet = useDB((s) => s.wallets.find((w) => w.user_id === me.user_id));
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: "key-outline", label: "Mot de passe", onPress: () => router.push("/settings") },
    { icon: "shield-checkmark-outline", label: "Authentification à deux facteurs", onPress: () => toast("Bientôt disponible", "info") },
    { icon: "phone-portrait-outline", label: "Appareils connectés", onPress: () => router.push("/settings") },
    { icon: "eye-off-outline", label: "Confidentialité", onPress: () => router.push("/settings") },
    { icon: "id-card-outline", label: me.identity_verified ? "Identité vérifiée" : "Vérifier mon identité", onPress: () => router.push("/verification/identity") },
    { icon: "share-social-outline", label: "Mes réseaux sociaux", onPress: () => router.push("/edit/socials") },
  ];
  return (
    <View>
      <View style={[styles.sectionHead, { alignItems: "center" }]}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <Text style={styles.sectionSub}>Gère la sécurité de ton compte et de tes informations.</Text>
        </View>
      </View>
      <View style={[styles.secBox, luxShadow]}>
        <GlossFill />
        <View style={styles.secGrid}>
          {rows.map((r, i) => (
            <Press key={r.label} onPress={r.onPress} style={[styles.secRow, i % 2 === 0 && styles.secRowLeft]} scaleTo={0.97}>
              <Ionicons name={r.icon} size={19} color={colors.primary} />
              <Text style={styles.secLabel} numberOfLines={2}>
                {r.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Press>
          ))}
        </View>
      </View>
      <Press onPress={() => router.push("/wallet")} style={[styles.walletRow, luxShadow]} scaleTo={0.98}>
        <GoldFill style={{ borderRadius: radius.lg }} />
        <Ionicons name="wallet-outline" size={22} color={colors.onPrimary} />
        <Text style={styles.walletText}>Mon portefeuille</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.walletText}>{fcfa(wallet?.balance ?? 0)}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
      </Press>
      <Text style={styles.logout} onPress={onLogout}>
        Se déconnecter
      </Text>
    </View>
  );
}

// ---------- écran ----------
export function CreatorProfileLux({ me, onLogout }: { me: Profile; onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const updateProfile = useDB((s) => s.updateProfile);
  const portfolio = useDB((s) => s.portfolio);
  const collaborations = useDB((s) => s.collaborations);
  const [tab, setTab] = useState<Tab>("portfolio");
  const [sheet, setSheet] = useState<"avatar" | "banner" | null>(null);

  const followers = Object.values(me.followers).reduce((a, f) => a + parseFollowers(f), 0);
  const views = portfolio.filter((p) => p.user_id === me.user_id).reduce((a, p) => a + (p.views_count ?? 0), 0);
  const collabs = collaborations.filter((c) => c.creator_id === me.user_id && c.status === "completed").length;
  const platforms = (Object.keys(PLATFORM) as SocialPlatform[]).filter((k) => parseFollowers(me.followers[k]) > 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <View style={styles.header}>
          <Press onPress={() => router.navigate("/(tabs)/home")} style={styles.headerBtn} scaleTo={0.9}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Press>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          <Press onPress={() => router.push("/settings")} style={styles.headerBtn} scaleTo={0.9}>
            <Ionicons name="settings-outline" size={22} color={colors.ink} />
          </Press>
        </View>

        {/* Couverture */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.cover}>
          <Image source={me.banner_url ?? SAMPLE_BANNERS[0]} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.35)", "#0B0B0B"]} locations={[0.4, 0.75, 1]} style={StyleSheet.absoluteFill} />
          <Press onPress={() => setSheet("banner")} style={styles.coverBtn} scaleTo={0.94}>
            <Ionicons name="camera-outline" size={15} color={colors.ink} />
            <Text style={styles.coverBtnText}>Modifier la couverture</Text>
          </Press>
        </Animated.View>

        {/* Identité */}
        <View style={styles.identity}>
          <Press onPress={() => setSheet("avatar")} scaleTo={0.95} style={{ marginTop: -54 }}>
            <GoldRing size={104}>
              <Image source={avatarOf(me)} style={{ flex: 1 }} contentFit="cover" />
            </GoldRing>
            <View style={styles.camBadge}>
              <Ionicons name="camera" size={15} color={colors.ink} />
            </View>
          </Press>
          <View style={{ flex: 1, paddingTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {me.full_name.split(" ")[0]} {me.full_name.split(" ").slice(-1)[0]?.[0]}.
              </Text>
              {me.identity_verified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
            <Text style={styles.role}>Créatrice de contenu</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={styles.location}>{me.residence_country ?? me.country ?? "—"}</Text>
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 10, flexDirection: "row", justifyContent: "flex-end" }}>
          <GoldOutlineBtn label="Modifier le profil" icon="pencil-outline" onPress={() => router.push("/edit/profile")} small />
        </View>
        {me.bio ? <Text style={styles.bio}>{me.bio}</Text> : null}

        {/* Réseaux + stats */}
        <View style={styles.statsRow}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {platforms.slice(0, 3).map((k) => (
              <Press key={k} onPress={() => router.push("/edit/socials")} style={styles.socialBtn} scaleTo={0.9}>
                <Ionicons name={PLATFORM[k].icon} size={19} color={colors.ink} />
              </Press>
            ))}
            <Press onPress={() => router.push("/edit/socials")} style={styles.socialBtn} scaleTo={0.9}>
              <Ionicons name="link-outline" size={19} color={colors.ink} />
            </Press>
          </View>
          <View style={styles.stats}>
            {[
              [formatFollowers(followers), "Abonnés"],
              [formatFollowers(views), "Vues"],
              [String(collabs), "Collabs"],
            ].map(([v, l], i) => (
              <View key={l} style={[styles.stat, i > 0 && styles.statDiv]}>
                <Text style={styles.statValue}>{v}</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Onglets */}
        <View style={styles.tabs}>
          <GlossFill style={{ borderRadius: radius.lg }} />
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Press key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, on && goldGlow]} scaleTo={0.94}>
                {on && <GoldFill style={{ borderRadius: 16 }} />}
                <Ionicons name={t.icon} size={19} color={on ? colors.onPrimary : colors.ink} />
                <Text style={[styles.tabText, on && { color: colors.onPrimary, fontWeight: "800" }]} numberOfLines={1}>
                  {t.label}
                </Text>
              </Press>
            );
          })}
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(220)}>
          {tab === "portfolio" && <PortfolioTab me={me} />}
          {tab === "pricing" && <PricingTab me={me} />}
          {tab === "offers" && <OffersTab me={me} />}
          {tab === "reviews" && <ReviewsTab me={me} />}
          {tab === "security" && <SecurityTab me={me} onLogout={onLogout} />}
        </Animated.View>
      </ScrollView>

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === "avatar" ? "Photo de profil" : "Photo de couverture"} subtitle="Sélection démo — la galerie sera branchée plus tard.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {(sheet === "banner" ? SAMPLE_BANNERS : SAMPLE_AVATARS).map((u, i) => (
            <Press
              key={i}
              onPress={() => {
                updateProfile(sheet === "banner" ? { banner_url: u } : { avatar_url: u });
                toast(sheet === "banner" ? "Couverture mise à jour" : "Photo mise à jour");
                setSheet(null);
              }}
              style={{ width: sheet === "banner" ? "100%" : 90, height: sheet === "banner" ? 110 : 90, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorder }}
            >
              <Image source={u} style={{ flex: 1 }} contentFit="cover" />
            </Press>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  cover: { height: 190, marginHorizontal: 0, marginTop: 4, overflow: "hidden" },
  coverBtn: { position: "absolute", right: 14, bottom: 22, flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "rgba(11,11,11,0.55)" },
  coverBtnText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  identity: { flexDirection: "row", gap: 14, paddingHorizontal: 16 },
  camBadge: { position: "absolute", right: 4, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: "#141414", borderWidth: 1, borderColor: goldBorderStrong, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.serif, color: colors.ink, fontSize: 24, flexShrink: 1 },
  role: { color: colors.inkSoft, fontSize: 14 },
  location: { color: colors.inkSoft, fontSize: 12 },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong },
  outlineText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  bio: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginTop: 12 },
  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 14, gap: 10 },
  socialBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
  stats: { flex: 1, flexDirection: "row" },
  stat: { flex: 1, alignItems: "center" },
  statDiv: { borderLeftWidth: 1, borderLeftColor: colors.line },
  statValue: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 10 },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, padding: 4, borderRadius: radius.lg, borderWidth: 1, borderColor: goldBorder, overflow: "hidden" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 9, borderRadius: 16 },
  tabText: { color: colors.ink, fontSize: 9, fontWeight: "600" },
  sectionHead: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  sectionSub: { color: colors.inkSoft, fontSize: 12, marginTop: 2 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  plusCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: goldBorderStrong, alignItems: "center", justifyContent: "center" },
  subChip: { flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.03)" },
  subChipText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  countText: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  tile: { width: TILE, height: TILE * 1.05, borderRadius: radius.sm, overflow: "hidden", backgroundColor: "#141210", borderWidth: 1, borderColor: goldBorder },
  views: { position: "absolute", left: 8, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  viewsText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  tileCaption: { position: "absolute", left: 8, right: 8, bottom: 6, color: colors.ink, fontSize: 10, fontWeight: "700" },
  addService: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong },
  addServiceText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  priceCard: { width: PRICE_W, minHeight: 92, flexDirection: "row", alignItems: "center", gap: 8, padding: 9, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  priceIcon: { width: 40, height: 56, borderRadius: 12, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  priceTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  priceDesc: { color: colors.inkSoft, fontSize: 10 },
  priceValue: { fontSize: 13, fontWeight: "800" },
  offerCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  brandLogo: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", borderWidth: 1, borderColor: goldBorder, backgroundColor: "#141210", alignItems: "center", justifyContent: "center" },
  brandMono: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 17 },
  offerTitle: { color: colors.ink, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  statusPill: { backgroundColor: "rgba(217,172,101,0.16)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: colors.primaryLight, fontSize: 10, fontWeight: "700" },
  offerSub: { color: colors.inkSoft, fontSize: 11 },
  offerBudget: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  offerDate: { color: colors.muted, fontSize: 10 },
  reviewCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  reviewText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  secBox: { marginHorizontal: 16, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  secGrid: { flexDirection: "row", flexWrap: "wrap" },
  secRow: { width: "50%", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.6)" },
  secRowLeft: { borderRightWidth: 1, borderRightColor: "rgba(53,48,42,0.6)" },
  secLabel: { flex: 1, color: colors.ink, fontSize: 11 },
  walletRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 14, height: 52, paddingHorizontal: 16, borderRadius: radius.lg },
  walletText: { color: colors.onPrimary, fontSize: 13, fontWeight: "800" },
  logout: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 20, textDecorationLine: "underline" },
});
