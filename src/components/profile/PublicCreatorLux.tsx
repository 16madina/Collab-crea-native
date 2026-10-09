// Profil public d'un créateur (vu par une marque, un autre créateur ou un invité).
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty, fmtDate, toast } from "../../kit";
import { GlossFill, GoldFill, GoldText, goldBorder, goldBorderStrong, goldGlow, luxShadow } from "../../lux";
import { useDB } from "../../store";
import { colors, fonts, radius } from "../../theme";
import type { Profile, SocialPlatform } from "../../types";
import { Press } from "../../ui";
import { DEFAULT_RATES, formatFollowers, money, parseFollowers, PLATFORM, platformOfType } from "../account/constants";
import { avatarOf, flagOf, nameOf } from "../collab/common";

const W = Dimensions.get("window").width;
const TILE = Math.floor((W - 16 - 12) / 3);
const PRICE_W = Math.floor((W - 32 - 10) / 2);
type Tab = "portfolio" | "pricing" | "collabs" | "about";
const ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  tiktok: "play-outline",
  instagram: "instagram",
  youtube: "youtube",
  snapchat: "snapchat",
  facebook: "facebook",
  pack: "package-variant-closed",
  other: "camera-outline",
};

export function PublicCreatorLux({ p, viewer, onPropose }: { p: Profile; viewer?: Profile; onPropose: () => void }) {
  const insets = useSafeAreaInsets();
  const portfolio = useDB((s) => s.portfolio);
  const collaborations = useDB((s) => s.collaborations);
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const reviews = useDB((s) => s.reviews);
  const follows = useDB((s) => s.follows);
  const toggleFollow = useDB((s) => s.toggleFollow);
  const startConversation = useDB((s) => s.startConversation);
  const [tab, setTab] = useState<Tab>("portfolio");

  const items = useMemo(() => portfolio.filter((x) => x.user_id === p.user_id), [portfolio, p.user_id]);
  const done = useMemo(() => collaborations.filter((c) => c.creator_id === p.user_id && c.status === "completed"), [collaborations, p.user_id]);
  const myReviews = useMemo(() => reviews.filter((r) => r.creator_id === p.user_id), [reviews, p.user_id]);
  const plats = (Object.keys(PLATFORM) as SocialPlatform[]).filter((k) => parseFollowers(p.followers[k]) > 0);
  const total = plats.reduce((a, k) => a + parseFollowers(p.followers[k]), 0);
  const rates = p.pricing?.items?.length ? p.pricing.items : DEFAULT_RATES;
  const cur = p.pricing?.currency ?? "XOF";
  const following = follows.includes(p.user_id);
  const self = viewer?.user_id === p.user_id;
  const isBrand = viewer?.role === "brand";
  const tags = [p.category, ...(p.tags ?? [])].filter(Boolean) as string[];

  const contact = () => {
    if (!viewer) return router.push("/auth/signup");
    const r = startConversation(p.user_id);
    if (!r.ok) return toast(r.error, "error");
    router.push(`/chat/${r.id}`);
  };
  const follow = () => {
    if (!viewer) return router.push("/auth/signup");
    toast(toggleFollow(p.user_id) ? `Tu suis ${p.full_name.split(" ")[0]}` : "Abonnement retiré", "info");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: self ? 40 : 120 }} showsVerticalScrollIndicator={false}>
        {/* Bannière plein cadre */}
        <Animated.View entering={FadeIn.duration(500)} style={[styles.hero, { height: 360 + insets.top }]}>
          <View style={styles.mono}>
            <Text style={styles.monoText}>{nameOf(p).slice(0, 2).toUpperCase()}</Text>
          </View>
          <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
          <LinearGradient colors={["rgba(11,11,11,0.45)", "rgba(11,11,11,0)", "rgba(11,11,11,0.55)", "#0B0B0B"]} locations={[0, 0.25, 0.7, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.full_name.split(" ")[0]} {p.full_name.split(" ").slice(-1)[0]?.[0]}.
                </Text>
                {p.identity_verified && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </View>
              <Text style={styles.role}>Créatrice de contenu</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.ink} />
                <Text style={styles.location}>
                  {flagOf(p.residence_country ?? p.country)} {p.residence_country ?? p.country}
                </Text>
              </View>
            </View>
            {!self && (
              <Press onPress={follow} style={[styles.follow, !following && goldGlow]} scaleTo={0.94}>
                {!following ? <GoldFill style={{ borderRadius: radius.pill }} /> : null}
                <Text style={[styles.followText, following && { color: colors.ink }]}>{following ? "Abonné ✓" : "Suivre"}</Text>
              </Press>
            )}
          </View>
        </Animated.View>

        {/* Audience */}
        <View style={styles.stats}>
          {plats.slice(0, 3).map((k, i) => (
            <View key={k} style={[styles.stat, i > 0 && styles.statDiv]}>
              <Text style={styles.statValue}>{formatFollowers(parseFollowers(p.followers[k]))}</Text>
              <Text style={styles.statLabel}>{PLATFORM[k].label}</Text>
            </View>
          ))}
          <View style={[styles.stat, styles.statDiv]}>
            <Text style={styles.statValue}>{formatFollowers(total)}</Text>
            <Text style={styles.statLabel}>Audience totale</Text>
          </View>
        </View>

        {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
        <View style={styles.tags}>
          {tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={styles.socials}>
          {plats.map((k) => (
            <Ionicons key={k} name={PLATFORM[k].icon} size={24} color={colors.ink} />
          ))}
        </View>

        {/* Onglets */}
        <View style={styles.tabs}>
          {(
            [
              ["portfolio", "Portfolio"],
              ["pricing", "Grille tarifaire"],
              ["collabs", "Collaborations"],
              ["about", "À propos"],
            ] as const
          ).map(([k, l]) => {
            const on = tab === k;
            return (
              <Press key={k} onPress={() => setTab(k)} style={styles.tab} scaleTo={0.95}>
                <Text style={[styles.tabText, on && { color: colors.ink, fontWeight: "800" }]}>{l}</Text>
                <View style={[styles.tabLine, on && styles.tabLineOn]}>{on && <GoldFill style={{ borderRadius: 2 }} />}</View>
              </Press>
            );
          })}
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(220)} style={{ paddingTop: 10 }}>
          {tab === "portfolio" &&
            (items.length === 0 ? (
              <Empty icon="images-outline" title="Portfolio vide" text="Ce créateur n'a pas encore ajouté de contenus." />
            ) : (
              <View style={styles.grid}>
                {items.map((it, i) => (
                  <Animated.View key={it.id} entering={FadeInDown.delay(i * 50).springify()}>
                    <View style={styles.tile}>
                      <Image source={it.media_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
                      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
                      <View style={styles.views}>
                        <Ionicons name={it.media_type === "video" ? "play" : "eye-outline"} size={13} color={colors.ink} />
                        <Text style={styles.viewsText}>{formatFollowers(it.views_count ?? 0)}</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ))}

          {tab === "pricing" && (
            <View style={[styles.grid, { gap: 10, paddingHorizontal: 16 }]}>
              {rates.map((it, i) => {
                const plat = platformOfType(it.type);
                const story = it.type.toLowerCase().includes("story");
                return (
                  <Animated.View key={`${it.type}-${i}`} entering={FadeInDown.delay(i * 60).springify()}>
                    <View style={[styles.priceCard, luxShadow]}>
                      <GlossFill />
                      <LinearGradient colors={["rgba(217,172,101,0.22)", "rgba(217,172,101,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.4, y: 0.8 }} style={StyleSheet.absoluteFill} />
                      <View style={styles.priceIcon}>
                        <MaterialCommunityIcons name={story ? "camera-outline" : ICON[plat]} size={22} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.priceTitle} numberOfLines={2}>
                          {it.type}
                        </Text>
                        {it.description ? (
                          <Text style={styles.priceDesc} numberOfLines={2}>
                            {it.description}
                          </Text>
                        ) : null}
                        <GoldText style={styles.priceValue}>{money(it.price, cur)}</GoldText>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}

          {tab === "collabs" &&
            (done.length === 0 ? (
              <Empty icon="briefcase-outline" title="Aucune collaboration publique" text="Les collaborations terminées apparaîtront ici." />
            ) : (
              <View style={{ gap: 10, paddingHorizontal: 16 }}>
                {done.map((c) => {
                  const o = offers.find((x) => x.id === c.offer_id);
                  const b = profiles.find((x) => x.user_id === c.brand_id);
                  const rv = myReviews.find((r) => r.collaboration_id === c.id);
                  return (
                    <View key={c.id} style={[styles.collabCard, luxShadow]}>
                      <GlossFill />
                      <View style={styles.brandLogo}>
                        <Text style={styles.brandMono}>{nameOf(b).slice(0, 2).toUpperCase()}</Text>
                        <Image source={avatarOf(b)} style={StyleSheet.absoluteFill} contentFit="cover" />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.collabTitle} numberOfLines={1}>
                          {o?.title}
                        </Text>
                        <Text style={styles.collabSub}>
                          {nameOf(b)} · {fmtDate(c.created_at, true)}
                        </Text>
                        {rv ? (
                          <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Ionicons key={n} name={n <= rv.rating ? "star" : "star-outline"} size={13} color={colors.primary} />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

          {tab === "about" && (
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {[
                ["Catégorie", tags.join(" · ")],
                ["Pays d'origine", `${flagOf(p.country)} ${p.country ?? "—"}`],
                ["Résidence", `${flagOf(p.residence_country)} ${p.residence_country ?? "—"}`],
                ["Note moyenne", p.rating ? `${p.rating} ★ (${myReviews.length} avis)` : "Pas encore d'avis"],
                ["Identité", p.identity_verified ? "Vérifiée ✓" : "Non vérifiée"],
              ].map(([l, v]) => (
                <View key={l} style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{l}</Text>
                  <Text style={styles.aboutValue}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Barre d'actions */}
      {!self && (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <LinearGradient colors={["rgba(11,11,11,0)", "#0B0B0B"]} locations={[0, 0.35]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Press onPress={contact} style={[styles.contact, !isBrand && { flex: 1 }]} scaleTo={0.96}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
            <Text style={styles.contactText}>Contacter</Text>
          </Press>
          {(isBrand || !viewer) && (
            <Press onPress={viewer ? onPropose : () => router.push("/auth/signup?role=brand")} style={[styles.propose, goldGlow]} scaleTo={0.96}>
              <GoldFill style={{ borderRadius: radius.lg }} />
              <Ionicons name="briefcase-outline" size={19} color={colors.onPrimary} />
              <Text style={styles.proposeText}>Proposer une collaboration</Text>
            </Press>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { justifyContent: "flex-end", backgroundColor: "#141210" },
  mono: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  monoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 90, opacity: 0.8 },
  heroBody: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 18, paddingBottom: 14 },
  name: { fontFamily: fonts.serif, color: colors.ink, fontSize: 30, flexShrink: 1 },
  role: { color: colors.ink, fontSize: 14, opacity: 0.9 },
  location: { color: colors.ink, fontSize: 12 },
  follow: { minWidth: 118, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: goldBorderStrong, marginBottom: 22 },
  followText: { color: colors.onPrimary, fontSize: 13, fontWeight: "800" },
  stats: { flexDirection: "row", marginHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(53,48,42,0.8)" },
  stat: { flex: 1, alignItems: "center" },
  statDiv: { borderLeftWidth: 1, borderLeftColor: "rgba(53,48,42,0.8)" },
  statValue: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  statLabel: { color: colors.inkSoft, fontSize: 10, marginTop: 1 },
  bio: { color: colors.ink, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginTop: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  tag: { borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  tagText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  socials: { flexDirection: "row", gap: 20, paddingHorizontal: 18, marginTop: 14 },
  tabs: { flexDirection: "row", marginTop: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.8)" },
  tab: { flex: 1, alignItems: "center", paddingTop: 8 },
  tabText: { color: colors.inkSoft, fontSize: 12, fontWeight: "600" },
  tabLine: { height: 3, width: "80%", marginTop: 8, borderRadius: 2, overflow: "hidden" },
  tabLineOn: {},
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 8 },
  tile: { width: TILE, height: TILE * 1.25, borderRadius: radius.sm, overflow: "hidden", borderWidth: 1, borderColor: goldBorder, backgroundColor: "#141210" },
  views: { position: "absolute", left: 7, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  viewsText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  priceCard: { width: PRICE_W, minHeight: 88, flexDirection: "row", alignItems: "center", gap: 8, padding: 9, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  priceIcon: { width: 40, height: 56, borderRadius: 12, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  priceTitle: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  priceDesc: { color: colors.inkSoft, fontSize: 10 },
  priceValue: { fontSize: 13, fontWeight: "800", marginTop: 3 },
  collabCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  brandLogo: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: goldBorder, backgroundColor: "#141210", alignItems: "center", justifyContent: "center" },
  brandMono: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 15 },
  collabTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  collabSub: { color: colors.inkSoft, fontSize: 11 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.7)" },
  aboutLabel: { color: colors.muted, fontSize: 12 },
  aboutValue: { color: colors.ink, fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingTop: 24 },
  contact: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, paddingHorizontal: 20, borderRadius: radius.lg, borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "rgba(11,11,11,0.9)" },
  contactText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  propose: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: radius.lg },
  proposeText: { color: colors.onPrimary, fontSize: 13, fontWeight: "800" },
});
