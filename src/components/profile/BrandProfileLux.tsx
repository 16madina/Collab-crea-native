// Profil de l'espace Marque (maquette) : couverture, logo, infos, stats et onglets.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty, toast } from "../../kit";
import { GlossFill, GoldButton, GoldFill, goldBorder, goldBorderStrong, goldGlow, luxShadow } from "../../lux";
import { budgetLabel, fcfa, useDB } from "../../store";
import { colors, fonts, radius } from "../../theme";
import { ACTIVE_COLLAB, type Offer, type Profile } from "../../types";
import { Press } from "../../ui";
import { formatFollowers, SAMPLE_BANNERS } from "../account/constants";
import { Sheet } from "../account/Sheet";
import { avatarOf, nameOf } from "../collab/common";
import { CreatorTile, totalFollowers } from "../home/CreatorTile";
import { useSpaceSwitch } from "../SpaceSwitcher";

const W = Dimensions.get("window").width;
type Tab = "campaigns" | "favorites" | "stats" | "about";
type CF = "all" | "active" | "pending" | "done";

const statusOf = (o: Offer): Exclude<CF, "all"> => {
  const expired = o.deadline && new Date(o.deadline).getTime() < Date.now();
  if (o.status === "draft") return "pending";
  if (o.status === "active" && !expired) return "active";
  return "done";
};
const STATUS = {
  active: { label: "En cours", bg: "rgba(76,195,138,0.18)", fg: "#6EDCA5" },
  pending: { label: "En attente", bg: "rgba(76,120,230,0.25)", fg: "#9DB6FF" },
  done: { label: "Terminée", bg: "rgba(255,255,255,0.1)", fg: colors.inkSoft },
};

export function BrandProfileLux({ me, onLogout }: { me: Profile; onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const collaborations = useDB((s) => s.collaborations);
  const favorites = useDB((s) => s.favorites);
  const profiles = useDB((s) => s.profiles);
  const portfolio = useDB((s) => s.portfolio);
  const deleteOffer = useDB((s) => s.deleteOffer);
  const renewOffer = useDB((s) => s.renewOffer);
  const updateProfile = useDB((s) => s.updateProfile);
  const sw = useSpaceSwitch();
  const [tab, setTab] = useState<Tab>(params.tab === "favorites" ? "favorites" : params.tab === "stats" ? "stats" : "campaigns");
  const [cf, setCf] = useState<CF>("all");
  const [menu, setMenu] = useState(false);
  const [offerMenu, setOfferMenu] = useState<Offer | null>(null);
  const [cover, setCover] = useState(false);
  useEffect(() => {
    if (params.tab === "favorites") setTab("favorites");
    else if (params.tab === "stats") setTab("stats");
  }, [params.tab]);

  const mine = useMemo(() => offers.filter((o) => o.brand_id === me.user_id).sort((a, b) => b.created_at.localeCompare(a.created_at)), [offers, me.user_id]);
  const counts = useMemo(() => ({ active: mine.filter((o) => statusOf(o) === "active").length, pending: mine.filter((o) => statusOf(o) === "pending").length, done: mine.filter((o) => statusOf(o) === "done").length }), [mine]);
  const list = cf === "all" ? mine : mine.filter((o) => statusOf(o) === cf);
  const myCollabs = useMemo(() => collaborations.filter((c) => c.brand_id === me.user_id), [collaborations, me.user_id]);
  const creatorsWorked = new Set(myCollabs.map((c) => c.creator_id)).size;
  const favCreators = useMemo(() => profiles.filter((p) => favorites.some((f) => f.brand_id === me.user_id && f.creator_id === p.user_id)), [profiles, favorites, me.user_id]);
  const views = useMemo(() => {
    const ids = new Set(myCollabs.map((c) => c.creator_id));
    return portfolio.filter((p) => ids.has(p.user_id)).reduce((a, p) => a + (p.views_count ?? 0), 0) + myCollabs.length * 120000;
  }, [portfolio, myCollabs]);
  const apps = applications.filter((a) => mine.some((o) => o.id === a.offer_id));
  const spent = myCollabs.filter((c) => c.paid).reduce((a, c) => a + c.agreed_amount, 0);

  const confirmDelete = (o: Offer) => {
    const run = () => {
      deleteOffer(o.id);
      toast("Campagne supprimée");
    };
    if (Platform.OS === "web") run();
    else Alert.alert("Supprimer la campagne ?", o.title, [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: run }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* Couverture */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.cover}>
          <Image source={me.banner_url ?? SAMPLE_BANNERS[2]} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(11,11,11,0.35)", "rgba(11,11,11,0)", "rgba(11,11,11,0.55)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <Press onPress={() => router.navigate("/(tabs)/home")} style={[styles.coverBtn, { left: 12 }]} scaleTo={0.9}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Press>
          <Press onPress={() => setMenu(true)} style={[styles.coverBtn, { right: 12 }]} scaleTo={0.9}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.ink} />
          </Press>
          <Press onPress={() => setCover(true)} style={styles.edit} scaleTo={0.94}>
            <Ionicons name="pencil-outline" size={14} color={colors.ink} />
            <Text style={styles.editText}>Modifier</Text>
          </Press>
        </Animated.View>

        {/* Identité */}
        <View style={styles.identity}>
          <View style={[styles.logoRing, goldGlow]}>
            <GoldFill style={{ borderRadius: 60 }} />
            <View style={styles.logoInner}>
              <Text style={styles.logoMono}>{nameOf(me).slice(0, 2).toUpperCase()}</Text>
              <Image source={avatarOf(me)} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          </View>
          <View style={{ flex: 1, paddingTop: 34 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {nameOf(me)}
              </Text>
              {me.identity_verified && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
            <Text style={styles.meta}>Marque • {me.sector?.split(" ")[0] ?? "Entreprise"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Ionicons name="location-outline" size={13} color={colors.primary} />
              <Text style={styles.meta}>{me.country ?? "—"}</Text>
            </View>
          </View>
        </View>
        {me.company_description ? <Text style={styles.desc}>{me.company_description}</Text> : null}
        {me.website ? (
          <View style={styles.website}>
            <Ionicons name="link-outline" size={15} color={colors.primary} />
            <Text style={styles.websiteText}>{me.website.replace(/^https?:\/\//, "")}</Text>
          </View>
        ) : null}

        {/* Réseaux + stats */}
        <View style={styles.statsRow}>
          <View style={{ flexDirection: "row", gap: 7 }}>
            {(["logo-instagram", "logo-tiktok", "logo-youtube", "globe-outline"] as const).map((ic) => (
              <Press key={ic} onPress={() => router.push("/edit/profile")} style={styles.social} scaleTo={0.9}>
                <Ionicons name={ic} size={17} color={colors.ink} />
              </Press>
            ))}
          </View>
          <View style={styles.stats}>
            {[
              [String(mine.length), "Campagnes"],
              [String(creatorsWorked + favCreators.length), "Créateurs"],
              [formatFollowers(views), "Vues générées"],
            ].map(([v, l]) => (
              <View key={l} style={styles.stat}>
                <Text style={styles.statValue}>{v}</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Onglets */}
        <View style={styles.tabs}>
          {(
            [
              ["campaigns", "Campagnes"],
              ["favorites", "Créateurs favoris"],
              ["stats", "Statistiques"],
              ["about", "À propos"],
            ] as const
          ).map(([k, l]) => {
            const on = tab === k;
            return (
              <Press key={k} onPress={() => setTab(k)} style={styles.tab} scaleTo={0.95}>
                <Text style={[styles.tabText, on && { color: colors.primary, fontWeight: "800" }]}>{l}</Text>
                <View style={styles.tabLine}>{on && <GoldFill style={{ borderRadius: 2 }} />}</View>
              </Press>
            );
          })}
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(220)}>
          {tab === "campaigns" && (
            <View>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Mes campagnes</Text>
                <GoldButton label="Créer une campagne" icon="add" size="sm" onPress={() => router.push("/offer/edit")} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
                {(
                  [
                    ["all", "Toutes"],
                    ["active", `En cours (${counts.active})`],
                    ["pending", `En attente (${counts.pending})`],
                    ["done", `Terminées (${counts.done})`],
                  ] as const
                ).map(([k, l]) => {
                  const on = cf === k;
                  return (
                    <Press key={k} onPress={() => setCf(k)} style={[styles.chip, on && [{ borderColor: "transparent" }, goldGlow]]} scaleTo={0.94}>
                      {on && <GoldFill style={{ borderRadius: radius.pill }} />}
                      <Text style={[styles.chipText, on && { color: colors.onPrimary, fontWeight: "800" }]}>{l}</Text>
                    </Press>
                  );
                })}
              </ScrollView>
              {list.length === 0 ? (
                <Empty icon="megaphone-outline" title="Aucune campagne" text="Crée ta première campagne pour recevoir des candidatures." />
              ) : (
                <View style={{ gap: 10, paddingHorizontal: 16 }}>
                  {list.map((o, i) => {
                    const st = STATUS[statusOf(o)];
                    const n = applications.filter((a) => a.offer_id === o.id).length;
                    return (
                      <Animated.View key={o.id} entering={FadeInDown.delay(i * 60).springify()} layout={LinearTransition}>
                        <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.row, luxShadow]} scaleTo={0.98}>
                          <GlossFill />
                          <View style={styles.thumb}>
                            {o.images[0] ? <Image source={o.images[0]} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="megaphone-outline" size={24} color={colors.primary} />}
                          </View>
                          <View style={{ flex: 1, gap: 6, paddingVertical: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {o.title}
                              </Text>
                              <View style={[styles.status, { backgroundColor: st.bg }]}>
                                <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                              </View>
                            </View>
                            <View style={[styles.cat]}>
                              <Text style={styles.catText}>{o.category}</Text>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
                              <Text style={styles.rowSub}>
                                {n} candidature{n > 1 ? "s" : ""}
                              </Text>
                              <Text style={styles.rowBudget} numberOfLines={1}>
                                {budgetLabel(o)}
                              </Text>
                            </View>
                          </View>
                          <View style={{ justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                            <Press onPress={() => setOfferMenu(o)} hitSlop={10} scaleTo={0.85}>
                              <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
                            </Press>
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                          </View>
                        </Press>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {tab === "favorites" &&
            (favCreators.length === 0 ? (
              <Empty icon="heart-outline" title="Aucun favori" text="Touche le cœur sur un créateur pour l'enregistrer ici." />
            ) : (
              <View style={styles.favGrid}>
                {favCreators.map((p) => (
                  <CreatorTile key={p.user_id} p={p} width={Math.floor((W - 32 - 16) / 3)} />
                ))}
              </View>
            ))}

          {tab === "stats" && (
            <View style={styles.statGrid}>
              {(
                [
                  ["megaphone-outline", String(counts.active), "Campagnes actives"],
                  ["people-outline", String(apps.length), "Candidatures reçues"],
                  ["briefcase-outline", String(myCollabs.filter((c) => ACTIVE_COLLAB.includes(c.status)).length), "Collaborations en cours"],
                  ["checkmark-done-outline", String(myCollabs.filter((c) => c.status === "completed").length), "Collaborations terminées"],
                  ["wallet-outline", fcfa(spent), "Investi au total"],
                  ["eye-outline", formatFollowers(views), "Vues générées"],
                ] as const
              ).map(([ic, v, l], i) => (
                <Animated.View key={l} entering={FadeInDown.delay(i * 60).springify()} style={[styles.statTile, luxShadow]}>
                  <GlossFill />
                  <Ionicons name={ic} size={20} color={colors.primary} />
                  <Text style={styles.statTileValue}>{v}</Text>
                  <Text style={styles.statTileLabel}>{l}</Text>
                </Animated.View>
              ))}
            </View>
          )}

          {tab === "about" && (
            <View style={{ paddingHorizontal: 16, gap: 2, marginTop: 6 }}>
              {[
                ["Entreprise", nameOf(me)],
                ["Secteur", me.sector ?? "—"],
                ["Pays", me.country ?? "—"],
                ["Site web", me.website ?? "—"],
                ["Email", me.email_verified ? "Vérifié ✓" : "Non vérifié"],
                ["Identité", me.identity_verified ? "Vérifiée ✓" : "Non vérifiée"],
              ].map(([l, v]) => (
                <View key={l} style={styles.aboutRow}>
                  <Text style={styles.aboutLabel}>{l}</Text>
                  <Text style={styles.aboutValue}>{v}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <GoldButton label="Modifier le profil" icon="pencil-outline" size="sm" onPress={() => router.push("/edit/profile")} />
                {!me.email_verified ? (
                  <Press
                    onPress={() => {
                      updateProfile({ email_verified: true });
                      toast("Email vérifié ✓");
                    }}
                    style={styles.outline}
                  >
                    <Text style={styles.outlineText}>Vérifier mon email (démo)</Text>
                  </Press>
                ) : null}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Menu ⋮ */}
      <Sheet visible={menu} onClose={() => setMenu(false)} title={nameOf(me)}>
        {(
          [
            ["swap-horizontal-outline", `Passer en espace ${sw.target === "brand" ? "Marque" : "Créateur"}`, () => sw.go()],
            ["settings-outline", "Paramètres", () => router.push("/settings")],
            ["notifications-outline", "Notifications", () => router.push("/notifications")],
            ["chatbubbles-outline", "Mes collaborations", () => router.push("/(tabs)/collabs?tab=collabs")],
            ["log-out-outline", "Se déconnecter", onLogout],
          ] as const
        ).map(([ic, l, fn]) => (
          <Press
            key={l}
            onPress={() => {
              setMenu(false);
              setTimeout(fn, 200);
            }}
            style={styles.menuRow}
          >
            <Ionicons name={ic} size={20} color={colors.primary} />
            <Text style={styles.menuText}>{l}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Press>
        ))}
      </Sheet>

      {/* Menu d'une campagne */}
      <Sheet visible={!!offerMenu} onClose={() => setOfferMenu(null)} title={offerMenu?.title ?? ""}>
        {offerMenu
          ? (
              [
                ["create-outline", "Modifier", () => router.push(`/offer/edit?id=${offerMenu.id}`)],
                ...(statusOf(offerMenu) === "done" ? ([["refresh-outline", "Renouveler (30 jours)", () => (renewOffer(offerMenu.id), toast("Campagne renouvelée"))]] as const) : []),
                ["eye-outline", "Voir la campagne", () => router.push(`/offer/${offerMenu.id}`)],
                ["trash-outline", "Supprimer", () => confirmDelete(offerMenu)],
              ] as const
            ).map(([ic, l, fn]) => (
              <Press
                key={l}
                onPress={() => {
                  setOfferMenu(null);
                  setTimeout(fn, 200);
                }}
                style={styles.menuRow}
              >
                <Ionicons name={ic} size={20} color={l === "Supprimer" ? colors.danger : colors.primary} />
                <Text style={[styles.menuText, l === "Supprimer" && { color: colors.danger }]}>{l}</Text>
              </Press>
            ))
          : null}
      </Sheet>

      {/* Couverture */}
      <Sheet visible={cover} onClose={() => setCover(false)} title="Photo de couverture" subtitle="Sélection démo — la galerie sera branchée plus tard.">
        {SAMPLE_BANNERS.map((u, i) => (
          <Press
            key={i}
            onPress={() => {
              updateProfile({ banner_url: u });
              toast("Couverture mise à jour");
              setCover(false);
            }}
            style={{ height: 110, borderRadius: radius.md, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: goldBorder }}
          >
            <Image source={u} style={{ flex: 1 }} contentFit="cover" />
          </Press>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { height: 180, marginHorizontal: 12, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  coverBtn: { position: "absolute", top: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11,11,11,0.45)" },
  edit: { position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "rgba(11,11,11,0.6)" },
  editText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  identity: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: -58 },
  logoRing: { width: 120, height: 120, borderRadius: 60, padding: 3 },
  logoInner: { flex: 1, borderRadius: 57, overflow: "hidden", backgroundColor: "#0B0B0B", alignItems: "center", justifyContent: "center" },
  logoMono: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 30 },
  name: { fontFamily: fonts.serif, color: colors.ink, fontSize: 22, flexShrink: 1 },
  meta: { color: colors.inkSoft, fontSize: 12 },
  desc: { color: colors.ink, fontSize: 13, lineHeight: 19, paddingHorizontal: 16, marginTop: 10 },
  website: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginTop: 6 },
  websiteText: { color: colors.ink, fontSize: 12 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginTop: 14 },
  social: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  stats: { flex: 1, flexDirection: "row" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  statLabel: { color: colors.inkSoft, fontSize: 9 },
  tabs: { flexDirection: "row", marginTop: 16, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.8)" },
  tab: { flex: 1, alignItems: "center", paddingTop: 6 },
  tabText: { color: colors.inkSoft, fontSize: 11, fontWeight: "600" },
  tabLine: { height: 3, width: "80%", marginTop: 8, borderRadius: 2, overflow: "hidden" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 20 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12, paddingRight: 10, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  thumb: { width: 92, alignItems: "center", justifyContent: "center", backgroundColor: "#141210" },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  status: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cat: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  catText: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  rowSub: { color: colors.inkSoft, fontSize: 11 },
  rowBudget: { color: colors.primary, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  favGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 14 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  statTile: { width: Math.floor((W - 32 - 10) / 2), padding: 14, gap: 6, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  statTileValue: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  statTileLabel: { color: colors.inkSoft, fontSize: 11 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.7)" },
  aboutLabel: { color: colors.muted, fontSize: 12 },
  aboutValue: { color: colors.ink, fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  outline: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorderStrong, justifyContent: "center" },
  outlineText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(53,48,42,0.6)" },
  menuText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
});
