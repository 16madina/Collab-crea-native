import { GuestGate } from "../../src/components/GuestGate";
import { CreatorsGrid } from "../../src/components/explore/CreatorsGrid";
import { GoldFill, goldBorder, goldGlow } from "../../src/lux";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStatusBadge, SearchBar } from "../../src/components/collab/common";
import { Badge, Chip, Empty, fmtDate, Segmented, toast } from "../../src/kit";
import { budgetLabel, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import type { Offer, OfferStatus } from "../../src/types";
import { Button, IconButton, Meta, OFFER_FALLBACK, Press } from "../../src/ui";

const CATS = ["Toutes", "Beauté", "Tech", "Cuisine", "Fitness", "Mode", "Lifestyle", "Musique", "Humour", "Business", "Éducation"];
const TYPES = ["Tous", "Reel", "TikTok", "Vidéo YouTube", "Story", "Podcast", "Post"];

function HRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      {children}
    </ScrollView>
  );
}

const confirm = (title: string, msg: string, ok: () => void) => {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (globalThis.confirm?.(`${title}\n${msg}`) ?? true) ok();
    return;
  }
  Alert.alert(title, msg, [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: ok },
  ]);
};

function CreatorOffers() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; cat?: string }>();
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const applications = useDB((s) => s.applications);
  const userId = useDB((s) => s.userId);
  const [q, setQ] = useState(params.q ?? "");
  const [status, setStatus] = useState<"all" | "new" | "applied">("all");
  const [cat, setCat] = useState(params.cat || "Toutes");
  const [country, setCountry] = useState("Tous");
  const [ctype, setCtype] = useState("Tous");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (params.q !== undefined) setQ(params.q);
    if (params.cat !== undefined) setCat(params.cat || "Toutes");
  }, [params.q, params.cat]);

  const active = useMemo(() => offers.filter((o) => o.status === "active"), [offers]);
  const countries = useMemo(() => ["Tous", ...[...new Set(active.flatMap((o) => (o.location ? o.location.split(",").map((x) => x.trim()) : [])))].sort()], [active]);
  const appOf = (id: string) => applications.find((a) => a.offer_id === id && a.creator_id === userId);
  const brandName = (id: string) => {
    const p = profiles.find((x) => x.user_id === id);
    return p?.company_name || p?.full_name || "";
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return active.filter((o) => {
      const applied = applications.some((a) => a.offer_id === o.id && a.creator_id === userId);
      if (status === "new" && applied) return false;
      if (status === "applied" && !applied) return false;
      if (cat !== "Toutes" && o.category !== cat) return false;
      if (country !== "Tous" && o.location && !o.location.includes(country)) return false;
      if (ctype !== "Tous" && !o.content_types.some((c) => c.toLowerCase().includes(ctype.toLowerCase()))) return false;
      if (t) {
        const hay = `${o.title} ${brandName(o.brand_id)} ${o.content_types.join(" ")}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, applications, userId, q, status, cat, country, ctype, profiles]);

  const nFilters = [cat !== "Toutes", country !== "Tous", ctype !== "Tous"].filter(Boolean).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 140, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.springify()} style={{ paddingHorizontal: 20 }}>
        <Text style={type.h1}>Offres</Text>
        <Text style={type.small}>Trouvez la campagne parfaite pour votre audience</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(60).springify()} style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Titre, marque, type de contenu…" style={{ flex: 1 }} />
        <Press onPress={() => setShowFilters((v) => !v)} style={[styles.filterBtn, shadow.soft, showFilters && { backgroundColor: colors.ink }]}>
          <Ionicons name="options-outline" size={22} color={showFilters ? "#fff" : colors.ink} />
          {nFilters ? (
            <View style={styles.count}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>{nFilters}</Text>
            </View>
          ) : null}
        </Press>
      </Animated.View>
      <View style={{ paddingHorizontal: 20 }}>
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Toutes" },
            { value: "new", label: "Nouvelles" },
            { value: "applied", label: "Postulées" },
          ]}
        />
      </View>
      {showFilters ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={{ gap: 10 }}>
          <Text style={[type.tiny, styles.fLabel]}>CATÉGORIE</Text>
          <HRow>
            {CATS.map((c) => (
              <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
            ))}
          </HRow>
          <Text style={[type.tiny, styles.fLabel]}>PAYS</Text>
          <HRow>
            {countries.map((c) => (
              <Chip key={c} label={c} on={country === c} onPress={() => setCountry(c)} />
            ))}
          </HRow>
          <Text style={[type.tiny, styles.fLabel]}>TYPE DE CONTENU</Text>
          <HRow>
            {TYPES.map((c) => (
              <Chip key={c} label={c} on={ctype === c} onPress={() => setCtype(c)} />
            ))}
          </HRow>
          {nFilters ? (
            <Press
              onPress={() => {
                setCat("Toutes");
                setCountry("Tous");
                setCtype("Tous");
              }}
              style={{ alignSelf: "flex-start", marginLeft: 20 }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Réinitialiser les filtres</Text>
            </Press>
          ) : null}
        </Animated.View>
      ) : null}

      <Text style={[type.small, { paddingHorizontal: 20 }]}>
        {list.length} offre{list.length > 1 ? "s" : ""} disponible{list.length > 1 ? "s" : ""}
      </Text>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        {list.length === 0 ? (
          <Empty icon="search-outline" title="Aucune offre trouvée" text="Essayez d'élargir vos filtres ou votre recherche." />
        ) : (
          list.map((o, i) => (
            <Animated.View key={o.id} entering={FadeInDown.delay(Math.min(i, 6) * 60).springify()} layout={LinearTransition.springify()}>
              <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.card, shadow.soft]} scaleTo={0.98}>
                <Image source={o.images[0] ?? OFFER_FALLBACK} style={styles.cardImg} contentFit="cover" transition={250} />
                <View style={{ position: "absolute", top: 12, right: 12 }}>
                  <AppStatusBadge status={appOf(o.id)?.status} />
                </View>
                <View style={{ padding: 14, gap: 6 }}>
                  <Text style={[type.small, { color: colors.primary, fontWeight: "700" }]}>
                    {brandName(o.brand_id)} · {o.category}
                  </Text>
                  <Text style={type.h3} numberOfLines={2}>
                    {o.title}
                  </Text>
                  <Meta icon="camera-outline" text={o.content_types.join(" · ")} />
                  <Meta icon="location-outline" text={o.presence_mode === "on_site" ? `📍 Sur place · ${o.on_site_city ?? ""}` : o.location || "Tous les pays africains"} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.ink }}>{budgetLabel(o)}</Text>
                    {o.deadline ? <Text style={type.tiny}>Jusqu'au {fmtDate(o.deadline)}</Text> : null}
                  </View>
                </View>
              </Press>
            </Animated.View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const STATUS_LABEL: Record<OfferStatus, [string, "success" | "warning" | "muted" | "danger"]> = {
  active: ["Active", "success"],
  expired: ["Expirée", "warning"],
  closed: ["Fermée", "danger"],
  draft: ["Brouillon", "muted"],
};

function BrandOffers() {
  const insets = useSafeAreaInsets();
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const userId = useDB((s) => s.userId);
  const deleteOffer = useDB((s) => s.deleteOffer);
  const renewOffer = useDB((s) => s.renewOffer);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OfferStatus>("all");

  const mine = useMemo(() => offers.filter((o) => o.brand_id === userId), [offers, userId]);
  const isExpired = (o: Offer) => o.status === "expired" || (o.status === "active" && !!o.deadline && new Date(o.deadline).getTime() < Date.now());
  const effective = (o: Offer): OfferStatus => (isExpired(o) ? "expired" : o.status);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return mine.filter((o) => (status === "all" || effective(o) === status) && (!t || o.title.toLowerCase().includes(t) || o.category.toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, q, status]);
  const countFor = (id: string) => applications.filter((a) => a.offer_id === id).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 140, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.springify()} style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={type.h1}>Mes offres</Text>
          <Text style={type.small}>
            {mine.length} offre{mine.length > 1 ? "s" : ""} publiée{mine.length > 1 ? "s" : ""}
          </Text>
        </View>
        <IconButton name="add" onPress={() => router.push("/offer/edit")} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(60).springify()} style={{ paddingHorizontal: 20, gap: 12 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher une offre…" />
        <Press onPress={() => router.push("/marketplace")} style={[styles.findRow, shadow.soft]} scaleTo={0.98}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={[type.h3, { flex: 1, fontSize: 13 }]}>Trouver des créateurs</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Press>
      </Animated.View>
      <HRow>
        {(
          [
            ["all", "Toutes"],
            ["active", "Actives"],
            ["expired", "Expirées"],
            ["closed", "Fermées"],
            ["draft", "Brouillons"],
          ] as const
        ).map(([v, l]) => (
          <Chip key={v} label={l} on={status === v} onPress={() => setStatus(v)} />
        ))}
      </HRow>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {list.length === 0 ? (
          <Empty icon="megaphone-outline" title="Aucune offre" text="Créez une offre pour recevoir des candidatures de créateurs." action={<Button label="Créer une offre" small icon="add" onPress={() => router.push("/offer/edit")} />} />
        ) : (
          list.map((o, i) => {
            const st = effective(o);
            const n = countFor(o.id);
            return (
              <Animated.View key={o.id} entering={FadeInDown.delay(Math.min(i, 6) * 60).springify()} exiting={FadeOut} layout={LinearTransition.springify()}>
                <View style={[styles.mineCard, shadow.soft]}>
                  <Press onPress={() => router.push(`/offer/${o.id}`)} style={{ flexDirection: "row", gap: 12 }} scaleTo={0.98}>
                    <Image source={o.images[0] ?? OFFER_FALLBACK} style={{ width: 72, height: 72, borderRadius: 16 }} contentFit="cover" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Badge label={STATUS_LABEL[st][0]} tone={STATUS_LABEL[st][1]} />
                        <Badge label={`${n} candidat${n > 1 ? "s" : ""}`} tone="primary" />
                      </View>
                      <Text style={type.h3} numberOfLines={2}>
                        {o.title}
                      </Text>
                      <Text style={type.small}>
                        {budgetLabel(o)} · {o.deadline ? `jusqu'au ${fmtDate(o.deadline)}` : "sans date limite"}
                      </Text>
                    </View>
                  </Press>
                  <View style={styles.actions}>
                    <Press onPress={() => router.push({ pathname: "/offer/edit", params: { id: o.id } })} style={styles.action}>
                      <Ionicons name="create-outline" size={16} color={colors.ink} />
                      <Text style={styles.actionText}>Modifier</Text>
                    </Press>
                    {st === "expired" ? (
                      <Press
                        onPress={() => {
                          renewOffer(o.id);
                          toast("Offre renouvelée pour 30 jours");
                        }}
                        style={styles.action}
                      >
                        <Ionicons name="refresh" size={16} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Renouveler</Text>
                      </Press>
                    ) : null}
                    <Press
                      onPress={() =>
                        confirm("Supprimer l'offre ?", "Cette action est irréversible.", () => {
                          deleteOffer(o.id);
                          toast("Offre supprimée");
                        })
                      }
                      style={styles.action}
                    >
                      <Ionicons name="trash-outline" size={16} color="#C53030" />
                      <Text style={[styles.actionText, { color: "#C53030" }]}>Supprimer</Text>
                    </Press>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function OffersInner() {
  const me = useMe();
  return me?.role === "brand" ? <BrandOffers /> : <CreatorOffers />;
}

const styles = StyleSheet.create({
  filterBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  count: { position: "absolute", top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  fLabel: { paddingHorizontal: 20, letterSpacing: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  cardImg: { height: 150, width: "100%" },
  findRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, padding: 14, borderRadius: radius.md },
  mineCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, gap: 12 },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  action: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 36, borderRadius: radius.pill, backgroundColor: "#F7F0EB" },
  actionText: { fontWeight: "700", fontSize: 11, color: colors.ink },
  exHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  exIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  exIconRing: { borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.03)" },
  exTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  exTabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 10, padding: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(255,255,255,0.03)" },
  exTab: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  exTabText: { color: colors.inkSoft, fontWeight: "700", fontSize: 12 },
});

// Explorer : onglets Créateurs (grille) et Offres (campagnes).
export default function Explore() {
  const insets = useSafeAreaInsets();
  const userId = useDB((s) => s.userId);
  const params = useLocalSearchParams<{ tab?: string; q?: string; cat?: string }>();
  const isCreator = useDB((s) => s.profiles.find((p) => p.user_id === s.userId)?.role === "creator");
  const [tab, setTab] = useState<"creators" | "offers">(params.tab === "offers" || params.q || params.cat || (!params.tab && isCreator) ? "offers" : "creators");
  useEffect(() => {
    if (!params.tab) setTab(isCreator ? "offers" : "creators");
  }, [isCreator]);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (params.tab === "offers" || params.tab === "creators") setTab(params.tab);
  }, [params.tab]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 4 }}>
      <View style={styles.exHeader}>
        <Press onPress={() => router.navigate("/(tabs)/home")} style={styles.exIcon} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Press>
        <Text style={styles.exTitle}>{tab === "creators" ? "Créateurs" : "Offres"}</Text>
        <Press onPress={() => (tab === "creators" ? setSearchOpen((v) => !v) : null)} style={[styles.exIcon, styles.exIconRing]} scaleTo={0.9}>
          <Ionicons name={searchOpen && tab === "creators" ? "close" : "search-outline"} size={21} color={colors.ink} />
        </Press>
      </View>
      <View style={styles.exTabs}>
        {(
          [
            ["creators", "Créateurs"],
            ["offers", "Offres"],
          ] as const
        ).map(([k, l]) => (
          <Press key={k} onPress={() => setTab(k)} style={[styles.exTab, tab === k && goldGlow]} scaleTo={0.96}>
            {tab === k && <GoldFill style={{ borderRadius: radius.pill }} />}
            <Text style={[styles.exTabText, tab === k && { color: colors.onPrimary }]}>{l}</Text>
          </Press>
        ))}
      </View>
      {tab === "creators" ? (
        <CreatorsGrid searchOpen={searchOpen} />
      ) : userId ? (
        <OffersInner />
      ) : (
        <GuestGate icon="megaphone-outline" title="Les offres t'attendent" text="Crée ton compte gratuit pour découvrir les campagnes et postuler en un geste." />
      )}
    </View>
  );
}
