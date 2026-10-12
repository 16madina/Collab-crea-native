// Grille tarifaire d'un créateur, telle que la voient les marques :
// photo de profil en fond, réseaux + abonnés, contenus unitaires, packages et options.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURRENCY_LABEL, DEFAULT_RATES, money, platformOfType } from "../../src/components/account/constants";
import { flagOf } from "../../src/components/collab/common";
import { Empty } from "../../src/kit";
import { goldBorder, luxShadow } from "../../src/lux";
import { useDB } from "../../src/store";
import { colors, fonts, radius } from "../../src/theme";
import type { PricingItem, SocialPlatform } from "../../src/types";
import { Press } from "../../src/ui";

const W = Dimensions.get("window").width;

const NET: Record<SocialPlatform, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; label: string }> = {
  tiktok: { icon: "logo-tiktok", bg: "#111111", fg: "#FFFFFF", label: "TikTok" },
  instagram: { icon: "logo-instagram", bg: "#E1306C", fg: "#FFFFFF", label: "Instagram" },
  youtube: { icon: "logo-youtube", bg: "#FF0000", fg: "#FFFFFF", label: "YouTube" },
  facebook: { icon: "logo-facebook", bg: "#1877F2", fg: "#FFFFFF", label: "Facebook" },
  snapchat: { icon: "logo-snapchat", bg: "#FFFC00", fg: "#111111", label: "Snapchat" },
};
const ORDER: SocialPlatform[] = ["tiktok", "instagram", "youtube", "facebook", "snapchat"];

function NetIcon({ p, size = 34 }: { p: SocialPlatform; size?: number }) {
  const n = NET[p];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: n.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={n.icon} size={size * 0.58} color={n.fg} />
    </View>
  );
}

const CARD_W = W - 24;

export default function RateCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const p = useDB((s) => s.profiles.find((x) => x.user_id === id));
  const [page, setPage] = useState(0);
  const pager = useRef<ScrollView>(null);
  const PAGE_W = CARD_W - 24;

  if (!p) return <Empty icon="person-outline" title="Créateur introuvable" />;
  const cur = p.pricing?.currency ?? "XOF";
  const all = p.pricing?.items?.length ? p.pricing.items : DEFAULT_RATES;
  // Une seule ligne par réseau : le service le moins cher (« dès » s'il y en a plusieurs).
  const perNet = ORDER.map((n) => {
    const list = all.filter((i) => platformOfType(i.type) === n).sort((x, y) => x.price - y.price);
    return { n, first: list[0] as PricingItem | undefined, count: list.length };
  });
  const packs = all.filter((i) => platformOfType(i.type) === "pack");
  const options = p.pricing?.options ?? [];
  const pages = ["Réseaux", "Packages", ...(options.length ? ["Options"] : [])];
  const nets = ORDER.filter((n) => p.followers?.[n]);
  const cats = [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 3) as string[];
  const place = p.residence_country || p.country;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* En-tête : photo de profil en fond */}
      <View style={[styles.hero, { paddingTop: insets.top + 6 }]}>
        <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
        <LinearGradient colors={["rgba(30,18,14,0.85)", "rgba(30,18,14,0.45)", "rgba(30,18,14,0.05)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <Press onPress={() => router.back()} style={styles.back} scaleTo={0.9}>
          <Ionicons name="chevron-back" size={22} color="#FFF8F3" />
        </Press>
        <View style={{ marginTop: "auto", gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.name} numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.identity_verified && <Ionicons name="checkmark-circle" size={20} color="#E8B98F" />}
          </View>
          <Text style={styles.heroSub} numberOfLines={1}>
            {["Créateur de contenu", ...cats].join(" • ")}
          </Text>
          {place ? (
            <Text style={styles.heroSub}>
              {flagOf(place)} {place}
            </Text>
          ) : null}
          {nets.length ? (
            <View style={styles.netRow}>
              {nets.map((n) => (
                <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <NetIcon p={n} size={20} />
                  <Text style={styles.netCount}>{p.followers[n]}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {/* Carte : pages à faire glisser (tout tient à l'écran) */}
      <View style={[styles.sheet, luxShadow, { marginBottom: insets.bottom + 12 }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.title}>Grille tarifaire</Text>
          <View style={styles.brandChip}>
            <Text style={styles.brandChipText}>Collab Créa</Text>
          </View>
        </View>
        <View style={styles.tabs}>
          {pages.map((t, i) => (
            <Press key={t} onPress={() => pager.current?.scrollTo({ x: i * PAGE_W, animated: true })} scaleTo={0.95}>
              <Text style={[styles.tab, page === i && styles.tabOn]}>{t}</Text>
            </Press>
          ))}
          <Text style={styles.curNote}>en {cur === "XOF" ? "FCFA" : CURRENCY_LABEL[cur]}</Text>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={pager}
          scrollEventThrottle={32}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / PAGE_W))}
          style={{ flex: 1 }}
        >
          {/* Page 1 : une ligne par réseau */}
          <View style={styles.page}>
            {perNet.map(({ n, first, count }) => (
              <View key={n} style={styles.row}>
                <NetIcon p={n} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {NET[n].label}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {first ? [first.type, first.description].filter(Boolean).join(" · ") : "Non proposé"}
                  </Text>
                </View>
                {first ? (
                  <View style={{ alignItems: "flex-end" }}>
                    {count > 1 ? <Text style={styles.from}>dès</Text> : null}
                    <Text style={styles.price}>{money(first.price, cur)}</Text>
                  </View>
                ) : (
                  <Text style={styles.none}>—</Text>
                )}
              </View>
            ))}
          </View>

          {/* Page 2 : packages */}
          <View style={styles.page}>
            {packs.length ? (
              packs.slice(0, 5).map((it, i) => (
                <View key={`p${i}`} style={styles.row}>
                  <View style={styles.packIcon}>
                    <Ionicons name={it.type.toLowerCase().startsWith("partenariat") ? "calendar-outline" : "cube-outline"} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {it.type}
                    </Text>
                    {it.description ? (
                      <Text style={styles.rowSub} numberOfLines={2}>
                        {it.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.price}>{money(it.price, cur)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Aucun package pour le moment.</Text>
            )}
          </View>

          {/* Page 3 : options */}
          {options.length ? (
            <View style={styles.page}>
              {options.slice(0, 6).map((o, i) => (
                <View key={`o${i}`} style={styles.row}>
                  <View style={styles.packIcon}>
                    <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
                  </View>
                  <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={2}>
                    {o.label}
                  </Text>
                  <Text style={styles.price}>+ {o.unit === "%" ? `${o.value} %` : money(o.value, cur)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.dots}>
          {pages.map((t, i) => (
            <View key={t} style={[styles.dot, page === i && styles.dotOn]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: Math.round(W * 0.62), paddingHorizontal: 18, paddingBottom: 38, backgroundColor: "#2A1A14" },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,18,14,0.35)", borderWidth: 1, borderColor: "rgba(255,248,243,0.3)" },
  name: { fontFamily: fonts.serif, color: "#FFF8F3", fontSize: 27, lineHeight: 32, flexShrink: 1 },
  heroSub: { color: "rgba(255,248,243,0.92)", fontSize: 13 },
  netRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  netCount: { color: "#FFF8F3", fontSize: 13, fontWeight: "700" },
  sheet: { flex: 1, marginTop: -26, marginHorizontal: 12, borderRadius: 26, paddingTop: 14, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: goldBorder, overflow: "hidden" },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 25 },
  brandChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: goldBorder },
  brandChipText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  tabs: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4, marginTop: 8, marginBottom: 8 },
  tab: { color: colors.muted, fontSize: 11, letterSpacing: 1.6, fontWeight: "600", textTransform: "uppercase" },
  tabOn: { color: colors.primary },
  curNote: { marginLeft: "auto", color: colors.muted, fontSize: 10 },
  page: { width: CARD_W - 24, gap: 7 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1, borderColor: goldBorder },
  packIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  rowSub: { color: colors.inkSoft, fontSize: 11, marginTop: 1 },
  from: { color: colors.muted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 },
  price: { color: colors.primary, fontSize: 14, fontWeight: "700", flexShrink: 0 },
  none: { color: colors.muted, fontSize: 14 },
  empty: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 30 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.primary },
});
