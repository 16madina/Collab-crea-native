import { GuestGate } from "../../src/components/GuestGate";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { ReactNode, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collabTypeLabel,
  formatFollowers,
  money,
  parseFollowers,
  PLATFORM,
  platformOfType,
  SAMPLE_AVATARS,
  SAMPLE_BANNERS,
} from "../../src/components/account/constants";
import { Sheet } from "../../src/components/account/Sheet";
import { PillTabs, Stars, VerifBadge, VerificationBanner } from "../../src/components/account/widgets";
import { Badge, Card, Empty, fmtDate, toast } from "../../src/kit";
import { budgetLabel, displayName, fcfa, useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { ACTIVE_COLLAB, Profile, SocialPlatform } from "../../src/types";
import { Avatar, Button, Glass, IconButton, Press } from "../../src/ui";

const TILE = (Dimensions.get("window").width - 40 - 16) / 3;

type CreatorTab = "infos" | "tarifs" | "candidatures" | "avis" | "securite";
type BrandTab = "entreprise" | "offres" | "favoris" | "collabs" | "avis" | "verification";

function ProfileTabInner() {
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const notifications = useDB((s) => s.notifications);
  const signOut = useDB((s) => s.signOut);
  const me = useMemo(() => profiles.find((p) => p.user_id === userId), [profiles, userId]);
  const unread = useMemo(() => notifications.some((n) => n.user_id === userId && !n.is_read), [notifications, userId]);

  if (!me) return <Redirect href="/" />;
  const logout = () => {
    signOut();
    router.replace("/");
  };
  return me.role === "creator" ? (
    <CreatorProfile me={me} unread={unread} onLogout={logout} />
  ) : me.role === "brand" ? (
    <BrandProfile me={me} unread={unread} onLogout={logout} />
  ) : (
    <AdminProfile me={me} unread={unread} onLogout={logout} />
  );
}

// ---------- en-tête commun ----------
function Header({ me, unread, avatarUri, children }: { me: Profile; unread: boolean; avatarUri: string | number; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const updateProfile = useDB((s) => s.updateProfile);
  const [sheet, setSheet] = useState<"avatar" | "banner" | null>(null);
  const banner = me.banner_url ?? SAMPLE_BANNERS[me.role === "brand" ? 2 : 0];
  return (
    <>
      <View style={{ height: 230 }}>
        <Image source={banner} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={["rgba(0,0,0,0.3)", "rgba(251,244,239,0)", colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.topBar, { top: insets.top + 6 }]}>
          <IconButton name="image-outline" dark onPress={() => setSheet("banner")} />
          <View style={{ flex: 1 }} />
          <IconButton name="notifications-outline" dark badge={unread} onPress={() => router.push("/notifications")} />
          <IconButton name="settings-outline" dark onPress={() => router.push("/settings")} />
        </View>
      </View>
      <View style={{ alignItems: "center", marginTop: -70, paddingHorizontal: 20 }}>
        <Animated.View entering={ZoomIn.springify()} style={[styles.avatarWrap, shadow.soft]}>
          <Press onPress={() => setSheet("avatar")} scaleTo={0.95}>
            <Avatar uri={avatarUri} size={108} />
            <View style={styles.editDot}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Press>
        </Animated.View>
        <Text style={[type.h1, { marginTop: 12, textAlign: "center" }]}>{displayName(me)}</Text>
        {children}
      </View>
      <Sheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === "avatar" ? (me.role === "brand" ? "Changer le logo" : "Photo de profil") : "Image de couverture"} subtitle="Sélection démo — la galerie sera branchée plus tard.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {(sheet === "banner" ? SAMPLE_BANNERS : SAMPLE_AVATARS).map((u, i) => (
            <Animated.View key={u} entering={ZoomIn.delay(i * 40).springify()} style={sheet === "banner" ? { width: "100%" } : undefined}>
              <Press
                scaleTo={0.92}
                onPress={() => {
                  updateProfile(sheet === "banner" ? { banner_url: u } : me.role === "brand" ? { logo_url: u, avatar_url: u } : { avatar_url: u });
                  toast(sheet === "banner" ? "Couverture mise à jour" : "Photo mise à jour");
                  setSheet(null);
                }}
                style={sheet === "banner" ? { height: 110, borderRadius: radius.md, overflow: "hidden" } : { width: 92, height: 92, borderRadius: 46, overflow: "hidden" }}
              >
                <Image source={u} style={{ flex: 1 }} contentFit="cover" />
              </Press>
            </Animated.View>
          ))}
        </View>
      </Sheet>
    </>
  );
}

function StatBar({ items }: { items: [string, string, boolean?][] }) {
  return (
    <Glass style={styles.stats} intensity={50}>
      {items.map(([n, l, hl], i) => (
        <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }]}>
          <Text style={[type.h2, { color: hl ? colors.primary : colors.ink }]}>{n}</Text>
          <Text style={type.tiny}>{l}</Text>
        </View>
      ))}
    </Glass>
  );
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.tiny}>{label}</Text>
        <Text style={{ color: colors.ink, fontWeight: "600" }}>{value || "—"}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={type.h3}>{title}</Text>
      {action ? (
        <Text onPress={onAction} style={{ color: colors.primary, fontWeight: "700" }}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

function Logout({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26 }}>
      <Ionicons name="log-out-outline" size={18} color={colors.muted} />
      <Text style={type.small}>Se déconnecter</Text>
    </Press>
  );
}

// ---------- créateur ----------
function CreatorProfile({ me, unread, onLogout }: { me: Profile; unread: boolean; onLogout: () => void }) {
  const wallets = useDB((s) => s.wallets);
  const collaborations = useDB((s) => s.collaborations);
  const applications = useDB((s) => s.applications);
  const offers = useDB((s) => s.offers);
  const reviews = useDB((s) => s.reviews);
  const portfolio = useDB((s) => s.portfolio);
  const socialVerifications = useDB((s) => s.socialVerifications);
  const profiles = useDB((s) => s.profiles);
  const [tab, setTab] = useState<CreatorTab>("infos");

  const wallet = useMemo(() => wallets.find((w) => w.user_id === me.user_id), [wallets, me.user_id]);
  const myCollabs = useMemo(() => collaborations.filter((c) => c.creator_id === me.user_id), [collaborations, me.user_id]);
  const myApps = useMemo(() => applications.filter((a) => a.creator_id === me.user_id), [applications, me.user_id]);
  const myReviews = useMemo(() => reviews.filter((r) => r.creator_id === me.user_id), [reviews, me.user_id]);
  const myPortfolio = useMemo(() => portfolio.filter((p) => p.user_id === me.user_id), [portfolio, me.user_id]);
  const totalFollowers = useMemo(() => Object.values(me.followers).reduce((a, v) => a + parseFollowers(v), 0), [me.followers]);
  const avgRating = myReviews.length ? myReviews.reduce((a, r) => a + r.rating, 0) / myReviews.length : me.rating;
  const completed = myCollabs.filter((c) => c.status === "completed").length;
  const svStatus = (p: SocialPlatform) => socialVerifications.find((v) => v.user_id === me.user_id && v.platform === p)?.status;

  const grouped = useMemo(() => {
    const g: Record<string, typeof items> = {};
    const items = me.pricing?.items ?? [];
    items.forEach((it) => {
      const k = platformOfType(it.type);
      (g[k] ??= []).push(it);
    });
    return g;
  }, [me.pricing]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <Header me={me} unread={unread} avatarUri={me.avatar_url}>
        <Text style={type.small}>
          {[me.category, me.residence_country].filter(Boolean).join(" · ") || "Créateur de contenu"}
        </Text>
        <View style={{ marginTop: 10 }}>
          <VerifBadge p={me} />
        </View>
        <StatBar
          items={[
            [formatFollowers(totalFollowers), "Abonnés"],
            [avgRating ? `${avgRating.toFixed(1)} ★` : "—", "Note", true],
            [String(completed), "Collabs"],
            [String(myPortfolio.length), "Portfolio"],
          ]}
        />
        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Button label="Modifier le profil" icon="create-outline" style={{ flex: 1 }} small onPress={() => router.push("/edit/profile")} />
          <Button label="Réseaux" variant="outline" icon="share-social-outline" small onPress={() => router.push("/edit/socials")} />
        </View>
      </Header>

      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <VerificationBanner p={me} />
      </View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <Press onPress={() => router.push("/wallet")} scaleTo={0.98} style={[styles.wallet, shadow.soft]}>
          <LinearGradient colors={["#FF6B47", "#E8431F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.orb} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600", flex: 1 }}>Solde disponible</Text>
            <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
          </View>
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.8 }}>{fcfa(wallet?.balance ?? 0)}</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
            {wallet?.pending_balance ? `${fcfa(wallet.pending_balance)} en cours de retrait · ` : ""}Orange · Wave · MTN · PayPal
          </Text>
        </Press>
      </Animated.View>

      <View style={{ marginTop: 22 }}>
        <PillTabs<CreatorTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "infos", label: "Infos" },
            { key: "tarifs", label: "Tarifs", count: me.pricing?.items.length ?? 0 },
            { key: "candidatures", label: "Candidatures", count: myApps.length },
            { key: "avis", label: "Avis", count: myReviews.length },
            { key: "securite", label: "Sécurité" },
          ]}
        />
      </View>

      <Animated.View key={tab} entering={FadeInDown.springify().damping(18)} layout={LinearTransition} style={{ paddingHorizontal: 20, marginTop: 16, gap: 14 }}>
        {tab === "infos" && (
          <>
            <Card>
              <SectionTitle title="À propos" action="Modifier" onAction={() => router.push("/edit/profile")} />
              <Text style={type.body}>{me.bio || "Ajoutez une bio pour vous présenter aux marques."}</Text>
              <InfoLine icon="home-outline" label="Pays de résidence" value={me.residence_country} />
              <InfoLine icon="flag-outline" label="Pays d'origine" value={me.country} />
              <InfoLine icon="pricetag-outline" label="Catégorie" value={me.category} />
            </Card>
            <Card>
              <SectionTitle title="Réseaux sociaux" action="Gérer" onAction={() => router.push("/edit/socials")} />
              {Object.keys(me.followers).length === 0 ? (
                <Text style={type.small}>Aucun réseau ajouté.</Text>
              ) : (
                (Object.keys(me.followers) as SocialPlatform[]).map((p) => {
                  const st = svStatus(p);
                  return (
                    <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
                      <View style={[styles.netIcon, { backgroundColor: PLATFORM[p].color }]}>
                        <Ionicons name={PLATFORM[p].icon} size={18} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", color: colors.ink }}>{PLATFORM[p].label}</Text>
                        <Text style={type.tiny}>{me.followers[p] ? `${me.followers[p]} abonnés` : "Abonnés non renseignés"}</Text>
                      </View>
                      {st === "verified" ? <Badge label="Vérifié" tone="success" /> : st === "pending_admin" ? <Badge label="En attente" tone="warning" /> : st === "rejected" ? <Badge label="Refusé" tone="danger" /> : <Badge label="Non vérifié" tone="muted" />}
                    </View>
                  );
                })
              )}
            </Card>
            <SectionTitle title="Portfolio" action={myPortfolio.length ? "Gérer" : "Ajouter"} onAction={() => router.push("/edit/portfolio")} />
            {myPortfolio.length === 0 ? (
              <Empty icon="images-outline" title="Portfolio vide" text="Montrez vos meilleurs contenus aux marques." action={<Button label="Ajouter un contenu" small icon="add" onPress={() => router.push("/edit/portfolio")} />} />
            ) : (
              <View style={styles.grid}>
                {myPortfolio.slice(0, 9).map((p, i) => (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <Press onPress={() => router.push("/edit/portfolio")} style={{ width: TILE, height: TILE * 1.3, borderRadius: radius.md, overflow: "hidden" }}>
                      <Image source={p.media_url} style={{ flex: 1 }} contentFit="cover" transition={250} />
                      {p.media_type === "video" ? (
                        <View style={styles.playBadge}>
                          <Ionicons name="play" size={12} color="#fff" />
                        </View>
                      ) : null}
                    </Press>
                  </Animated.View>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "tarifs" && (
          <>
            <SectionTitle title="Ma grille tarifaire" action="Modifier" onAction={() => router.push("/edit/pricing")} />
            {!me.pricing?.items.length ? (
              <Empty icon="pricetags-outline" title="Aucun tarif" text="Définissez vos tarifs pour que les marques connaissent vos prix." action={<Button label="Créer ma grille" small icon="add" onPress={() => router.push("/edit/pricing")} />} />
            ) : (
              Object.entries(grouped).map(([k, items]) => {
                const meta = k in PLATFORM ? PLATFORM[k as SocialPlatform] : null;
                return (
                  <Card key={k}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[styles.netIcon, { backgroundColor: meta?.color ?? colors.primary }]}>
                        <Ionicons name={meta?.icon ?? (k === "pack" ? "cube-outline" : "pricetag-outline")} size={18} color="#fff" />
                      </View>
                      <Text style={type.h3}>{meta?.label ?? (k === "pack" ? "Packs" : "Autres")}</Text>
                    </View>
                    {items.map((it, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "600", color: colors.ink }}>{it.type}</Text>
                          {it.description ? <Text style={type.tiny}>{it.description}</Text> : null}
                        </View>
                        <Text style={{ fontWeight: "800", color: colors.primary }}>{money(it.price, me.pricing!.currency)}</Text>
                      </View>
                    ))}
                  </Card>
                );
              })
            )}
          </>
        )}

        {tab === "candidatures" &&
          (myApps.length === 0 ? (
            <Empty icon="paper-plane-outline" title="Aucune candidature" text="Parcourez les offres et postulez à celles qui vous correspondent." action={<Button label="Voir les offres" small onPress={() => router.push("/(tabs)/offers")} />} />
          ) : (
            myApps.map((a, i) => {
              const o = offers.find((x) => x.id === a.offer_id);
              const brand = profiles.find((p) => p.user_id === o?.brand_id);
              return (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <Press onPress={() => o && router.push(`/offer/${o.id}`)} scaleTo={0.98} style={[styles.rowCard, shadow.soft]}>
                    {brand ? <Avatar uri={brand.logo_url ?? brand.avatar_url} size={44} /> : null}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={type.h3} numberOfLines={1}>
                        {o?.title ?? "Offre supprimée"}
                      </Text>
                      <Text style={type.tiny}>
                        {displayName(brand)} · {fmtDate(a.created_at)} {o ? `· ${budgetLabel(o)}` : ""}
                      </Text>
                    </View>
                    <Badge label={a.status === "accepted" ? "Acceptée" : a.status === "rejected" ? "Refusée" : "En attente"} tone={a.status === "accepted" ? "success" : a.status === "rejected" ? "danger" : "warning"} />
                  </Press>
                </Animated.View>
              );
            })
          ))}

        {tab === "avis" && <ReviewsList reviews={myReviews} who="brand" />}

        {tab === "securite" && (
          <>
            <Card>
              <SectionTitle title="Vérification d'identité" />
              <Text style={type.small}>
                {me.identity_verified
                  ? "Votre identité est vérifiée. Vous pouvez postuler et échanger librement."
                  : me.identity_submitted_at
                    ? `Demande envoyée le ${fmtDate(me.identity_submitted_at, true)}. Examen sous 24–48 h.`
                    : "Requis pour postuler aux offres et envoyer des messages."}
              </Text>
              <VerifBadge p={me} />
              <Button label={me.identity_verified ? "Voir le statut" : me.identity_submitted_at ? "Suivre ma demande" : "Vérifier mon identité"} small icon="shield-checkmark-outline" onPress={() => router.push("/verification/identity")} />
            </Card>
            <Card>
              <SectionTitle title="Réseaux vérifiés" />
              <Text style={type.small}>Faites certifier vos abonnés pour inspirer confiance aux marques.</Text>
              <Button label="Gérer mes réseaux" small variant="outline" icon="share-social-outline" onPress={() => router.push("/edit/socials")} />
            </Card>
            <Card>
              <SectionTitle title="Compte" />
              <InfoLine icon="mail-outline" label="Email" value={me.email_verified ? "Vérifié" : "Non vérifié"} />
              <Button label="Paramètres" small variant="ghost" icon="settings-outline" onPress={() => router.push("/settings")} />
            </Card>
          </>
        )}
      </Animated.View>

      <Logout onPress={onLogout} />
    </ScrollView>
  );
}

function ReviewsList({ reviews, who }: { reviews: { id: string; brand_id: string; creator_id: string; rating: number; comment: string; created_at: string }[]; who: "brand" | "creator" }) {
  const profiles = useDB((s) => s.profiles);
  if (!reviews.length) return <Empty icon="star-outline" title="Aucun avis" text={who === "brand" ? "Les avis des marques apparaîtront après vos collaborations." : "Notez vos créateurs à la fin d'une collaboration."} />;
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  return (
    <>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontSize: 36, fontWeight: "800", color: colors.ink }}>{avg.toFixed(1)}</Text>
        <View style={{ gap: 4 }}>
          <Stars value={avg} size={18} />
          <Text style={type.small}>{reviews.length} avis</Text>
        </View>
      </Card>
      {reviews.map((r, i) => {
        const p = profiles.find((x) => x.user_id === (who === "brand" ? r.brand_id : r.creator_id));
        return (
          <Animated.View key={r.id} entering={FadeInDown.delay(i * 50).springify()}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {p ? <Avatar uri={p.logo_url ?? p.avatar_url} size={36} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: colors.ink }}>{displayName(p)}</Text>
                  <Text style={type.tiny}>{fmtDate(r.created_at, true)}</Text>
                </View>
                <Stars value={r.rating} />
              </View>
              <Text style={type.body}>{r.comment}</Text>
            </Card>
          </Animated.View>
        );
      })}
    </>
  );
}

// ---------- marque ----------
function BrandProfile({ me, unread, onLogout }: { me: Profile; unread: boolean; onLogout: () => void }) {
  const offers = useDB((s) => s.offers);
  const favorites = useDB((s) => s.favorites);
  const profiles = useDB((s) => s.profiles);
  const collaborations = useDB((s) => s.collaborations);
  const reviews = useDB((s) => s.reviews);
  const [tab, setTab] = useState<BrandTab>("entreprise");

  const myOffers = useMemo(() => offers.filter((o) => o.brand_id === me.user_id), [offers, me.user_id]);
  const active = myOffers.filter((o) => o.status === "active");
  const favs = useMemo(() => favorites.filter((f) => f.brand_id === me.user_id).map((f) => profiles.find((p) => p.user_id === f.creator_id)).filter(Boolean) as Profile[], [favorites, profiles, me.user_id]);
  const myCollabs = useMemo(() => collaborations.filter((c) => c.brand_id === me.user_id), [collaborations, me.user_id]);
  const myReviews = useMemo(() => reviews.filter((r) => r.brand_id === me.user_id), [reviews, me.user_id]);
  const activeCollabs = myCollabs.filter((c) => ACTIVE_COLLAB.includes(c.status));
  const doneCollabs = myCollabs.filter((c) => c.status === "completed");
  const spent = doneCollabs.reduce((a, c) => a + c.agreed_amount, 0);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <Header me={me} unread={unread} avatarUri={me.logo_url ?? me.avatar_url}>
        <Text style={type.small}>{[me.sector, me.country].filter(Boolean).join(" · ")}</Text>
        <View style={{ marginTop: 10 }}>
          <VerifBadge p={me} />
        </View>
        <StatBar
          items={[
            [String(active.length), "Offres actives", true],
            [String(myCollabs.filter((c) => c.status !== "refused").length), "Collabs"],
            [String(favs.length), "Favoris"],
          ]}
        />
        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Button label="Modifier le profil" icon="create-outline" style={{ flex: 1 }} small onPress={() => router.push("/edit/profile")} />
          <Button label="Offre" variant="outline" icon="add" small onPress={() => router.push("/offer/edit")} />
        </View>
      </Header>

      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <VerificationBanner p={me} />
      </View>

      <View style={{ marginTop: 20 }}>
        <PillTabs<BrandTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "entreprise", label: "Entreprise" },
            { key: "offres", label: "Offres", count: myOffers.length },
            { key: "favoris", label: "Favoris", count: favs.length },
            { key: "collabs", label: "Collabs", count: activeCollabs.length },
            { key: "avis", label: "Avis", count: myReviews.length },
            { key: "verification", label: "Vérification" },
          ]}
        />
      </View>

      <Animated.View key={tab} entering={FadeInDown.springify().damping(18)} style={{ paddingHorizontal: 20, marginTop: 16, gap: 14 }}>
        {tab === "entreprise" && (
          <>
            <Card>
              <SectionTitle title="À propos" action="Modifier" onAction={() => router.push("/edit/profile")} />
              <Text style={type.body}>{me.company_description || "Ajoutez une description de votre entreprise."}</Text>
              <InfoLine icon="business-outline" label="Entreprise" value={me.company_name} />
              <InfoLine icon="grid-outline" label="Secteur" value={me.sector} />
              <InfoLine icon="globe-outline" label="Site web" value={me.website?.replace(/^https?:\/\//, "")} />
              <InfoLine icon="location-outline" label="Pays" value={me.residence_country ?? me.country} />
            </Card>
            <Card>
              <SectionTitle title="Préférences" action="Modifier" onAction={() => router.push("/edit/profile")} />
              <Text style={type.tiny}>TYPES DE COLLABORATION</Text>
              <View style={styles.wrap}>
                {(me.brand_prefs?.collaboration_types ?? []).map((c) => (
                  <Badge key={c} label={collabTypeLabel(c)} />
                ))}
                {!me.brand_prefs?.collaboration_types.length ? <Text style={type.small}>—</Text> : null}
              </View>
              <Text style={[type.tiny, { marginTop: 6 }]}>CATÉGORIES DE CRÉATEURS</Text>
              <View style={styles.wrap}>
                {(me.brand_prefs?.target_categories ?? []).map((c) => (
                  <Badge key={c} label={c} tone="dark" />
                ))}
                {!me.brand_prefs?.target_categories.length ? <Text style={type.small}>—</Text> : null}
              </View>
            </Card>
          </>
        )}

        {tab === "offres" && (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(
                [
                  ["Actives", myOffers.filter((o) => o.status === "active").length, "success"],
                  ["Brouillons", myOffers.filter((o) => o.status === "draft").length, "muted"],
                  ["Expirées", myOffers.filter((o) => o.status === "expired" || o.status === "closed").length, "danger"],
                ] as const
              ).map(([l, n]) => (
                <Card key={l} style={{ flex: 1, alignItems: "center", gap: 2, padding: 12 }}>
                  <Text style={type.h2}>{n}</Text>
                  <Text style={type.tiny}>{l}</Text>
                </Card>
              ))}
            </View>
            {myOffers.length === 0 ? (
              <Empty icon="briefcase-outline" title="Aucune offre" text="Publiez votre première offre pour recevoir des candidatures." />
            ) : (
              myOffers.slice(0, 5).map((o, i) => (
                <Animated.View key={o.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <Press onPress={() => router.push(`/offer/${o.id}`)} scaleTo={0.98} style={[styles.rowCard, shadow.soft]}>
                    {o.images[0] ? <Image source={o.images[0]} style={{ width: 48, height: 48, borderRadius: 12 }} /> : <View style={[styles.infoIcon, { width: 48, height: 48 }]}><Ionicons name="briefcase-outline" size={20} color={colors.primary} /></View>}
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3} numberOfLines={1}>
                        {o.title}
                      </Text>
                      <Text style={type.tiny}>{budgetLabel(o)}</Text>
                    </View>
                    <Badge label={{ active: "Active", draft: "Brouillon", closed: "Fermée", expired: "Expirée" }[o.status]} tone={o.status === "active" ? "success" : o.status === "draft" ? "muted" : "danger"} />
                  </Press>
                </Animated.View>
              ))
            )}
            <Button label="Gérer mes offres" variant="outline" small onPress={() => router.push("/(tabs)/offers")} />
          </>
        )}

        {tab === "favoris" &&
          (favs.length === 0 ? (
            <Empty icon="heart-outline" title="Aucun favori" text="Ajoutez des créateurs en favoris depuis leur profil." />
          ) : (
            favs.map((p, i) => (
              <Animated.View key={p.user_id} entering={FadeInDown.delay(i * 50).springify()}>
                <Press onPress={() => router.push(`/profile/${p.user_id}`)} scaleTo={0.98} style={[styles.rowCard, shadow.soft]}>
                  <Avatar uri={p.avatar_url} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{p.full_name}</Text>
                    <Text style={type.tiny}>
                      {p.category} · {formatFollowers(Object.values(p.followers).reduce((a, v) => a + parseFollowers(v), 0))} abonnés
                    </Text>
                  </View>
                  <Ionicons name="heart" size={20} color={colors.primary} />
                </Press>
              </Animated.View>
            ))
          ))}

        {tab === "collabs" && (
          <>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Card style={{ flex: 1, padding: 14, gap: 2 }}>
                <Text style={type.h2}>{activeCollabs.length}</Text>
                <Text style={type.tiny}>En cours</Text>
              </Card>
              <Card style={{ flex: 1, padding: 14, gap: 2 }}>
                <Text style={type.h2}>{doneCollabs.length}</Text>
                <Text style={type.tiny}>Terminées</Text>
              </Card>
            </View>
            <Card style={{ backgroundColor: colors.night }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Investi en collaborations</Text>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{fcfa(spent)}</Text>
            </Card>
            <Button label="Voir mes collaborations" small onPress={() => router.push("/(tabs)/collabs")} />
          </>
        )}

        {tab === "avis" && <ReviewsList reviews={myReviews} who="creator" />}

        {tab === "verification" && <BrandVerification me={me} />}
      </Animated.View>

      <Logout onPress={onLogout} />
    </ScrollView>
  );
}

function BrandVerification({ me }: { me: Profile }) {
  const updateProfile = useDB((s) => s.updateProfile);
  return (
    <>
      <Card>
        <SectionTitle title="Email" />
        <Text style={type.small}>{me.email_verified ? "Votre email est vérifié. Vous pouvez contacter les créateurs." : "Vérifiez votre email pour pouvoir proposer des collaborations aux créateurs."}</Text>
        <VerifBadge p={me} />
        {!me.email_verified ? (
          <View style={{ gap: 8 }}>
            <Button label="Renvoyer l'email" small variant="outline" icon="mail-outline" onPress={() => toast("Email de vérification renvoyé")} />
            <Button
              label="J'ai cliqué sur le lien (démo)"
              small
              icon="checkmark"
              onPress={() => {
                updateProfile({ email_verified: true });
                toast("Email vérifié !");
              }}
            />
          </View>
        ) : null}
      </Card>
      <Card>
        <SectionTitle title="Identité du représentant" />
        <Text style={type.small}>Optionnel pour les marques : renforce la confiance des créateurs.</Text>
        <Button label="Ouvrir" small variant="ghost" icon="shield-checkmark-outline" onPress={() => router.push("/verification/identity")} />
      </Card>
    </>
  );
}

// ---------- admin ----------
function AdminProfile({ me, unread, onLogout }: { me: Profile; unread: boolean; onLogout: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
      <Header me={me} unread={unread} avatarUri={me.avatar_url}>
        <Text style={type.small}>Administrateur</Text>
        <View style={{ width: "100%", marginTop: 18, gap: 10 }}>
          <Button label="Tableau de bord admin" icon="speedometer-outline" onPress={() => router.push("/admin")} />
          <Button label="Paramètres" variant="outline" icon="settings-outline" onPress={() => router.push("/settings")} />
        </View>
      </Header>
      <Logout onPress={onLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: 20, right: 20, flexDirection: "row", gap: 10 },
  avatarWrap: { borderRadius: 60, borderWidth: 4, borderColor: colors.bg },
  editDot: { position: "absolute", right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  stats: { flexDirection: "row", width: "100%", paddingVertical: 16, marginVertical: 18, backgroundColor: "rgba(255,255,255,0.75)" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  wallet: { marginHorizontal: 20, marginTop: 16, borderRadius: radius.xl, padding: 22, gap: 4, overflow: "hidden" },
  orb: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.14)", right: -50, top: -60 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  playBadge: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  infoIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  netIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});

export default function ProfileTab() {
  const userId = useDB((s) => s.userId);
  if (!userId) return <GuestGate icon="person-circle-outline" title="Ton espace Collab Créa" text="Crée ton profil pour présenter ton talent, tes réseaux et tes tarifs." />;
  return <ProfileTabInner />;
}
