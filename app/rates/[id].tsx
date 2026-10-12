// Grille tarifaire d'un créateur, telle que la voient les marques :
// photo de profil en fond, réseaux + abonnés, contenus unitaires, packages et options.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
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
const ORDER: SocialPlatform[] = ["instagram", "tiktok", "youtube", "facebook", "snapchat"];

function NetIcon({ p, size = 34 }: { p: SocialPlatform; size?: number }) {
  const n = NET[p];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: n.bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={n.icon} size={size * 0.58} color={n.fg} />
    </View>
  );
}

/** Titre et sous-titre d'une ligne (la description sert de détail). */
const splitItem = (it: PricingItem) => ({ title: it.type, sub: it.description });

export default function RateCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const p = useDB((s) => s.profiles.find((x) => x.user_id === id));
  const portfolio = useDB((s) => s.portfolio);
  const thumbs = useMemo(() => {
    const imgs = portfolio.filter((x) => x.user_id === id && x.media_type === "image").map((x) => x.media_url);
    return imgs.length ? imgs : p ? [p.avatar_url] : [];
  }, [portfolio, id, p]);

  if (!p) return <Empty icon="person-outline" title="Créateur introuvable" />;
  const cur = p.pricing?.currency ?? "XOF";
  const all = p.pricing?.items?.length ? p.pricing.items : DEFAULT_RATES;
  const units = all.filter((i) => platformOfType(i.type) !== "pack");
  const packs = all.filter((i) => platformOfType(i.type) === "pack");
  const options = p.pricing?.options ?? [];
  const nets = ORDER.filter((n) => p.followers?.[n]);
  const cats = [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 3) as string[];
  const place = p.residence_country || p.country;
  const thumb = (i: number) => thumbs[i % Math.max(1, thumbs.length)];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        {/* En-tête : photo de profil en fond */}
        <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          <LinearGradient colors={["rgba(30,18,14,0.82)", "rgba(30,18,14,0.45)", "rgba(30,18,14,0.1)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(30,18,14,0)", "rgba(30,18,14,0.55)"]} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
          <Press onPress={() => router.back()} style={styles.back} scaleTo={0.9}>
            <Ionicons name="chevron-back" size={22} color="#FFF8F3" />
          </Press>
          <View style={{ marginTop: "auto", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.name} numberOfLines={1}>
                {p.full_name}
              </Text>
              {p.identity_verified && <Ionicons name="checkmark-circle" size={22} color="#E8B98F" />}
            </View>
            <Text style={styles.heroSub}>Créateur de contenu</Text>
            {cats.length ? <Text style={styles.heroSub}>{cats.join(" • ")}</Text> : null}
            {place ? (
              <Text style={styles.heroSub}>
                {flagOf(place)} {place}
              </Text>
            ) : null}
            {nets.length ? (
              <View style={styles.netRow}>
                {nets.map((n) => (
                  <View key={n} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <NetIcon p={n} size={24} />
                    <Text style={styles.netCount}>{p.followers[n]}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Carte grille tarifaire */}
        <View style={[styles.sheet, luxShadow]}>
          <View style={styles.sheetHead}>
            <Text style={styles.title}>Grille tarifaire</Text>
            <View style={styles.brandChip}>
              <Text style={styles.brandChipText}>Collab Créa</Text>
            </View>
          </View>
          <Text style={styles.curNote}>Tarifs en {cur === "XOF" ? "FCFA" : CURRENCY_LABEL[cur]}</Text>

          {units.length ? (
            <>
              <Text style={styles.section}>CONTENUS UNITAIRES</Text>
              {units.map((it, i) => {
                const plat = platformOfType(it.type);
                const { title, sub } = splitItem(it);
                return (
                  <Animated.View key={`u${i}`} entering={FadeInDown.delay(80 + i * 40).duration(320)} style={styles.row}>
                    {plat in NET ? <NetIcon p={plat as SocialPlatform} size={30} /> : <View style={[styles.genericIcon]}><Ionicons name="pricetag-outline" size={18} color={colors.primary} /></View>}
                    <Image source={thumb(i)} style={styles.thumb} contentFit="cover" contentPosition="top" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      {sub ? (
                        <Text style={styles.rowSub} numberOfLines={2}>
                          {sub}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.price}>{money(it.price, cur)}</Text>
                  </Animated.View>
                );
              })}
            </>
          ) : null}

          {packs.length ? (
            <>
              <Text style={[styles.section, { marginTop: 18 }]}>PACKAGES POPULAIRES 🔥</Text>
              {packs.map((it, i) => (
                <Animated.View key={`p${i}`} entering={FadeInDown.delay(120 + i * 50).duration(320)} style={[styles.row, styles.packRow]}>
                  <Image source={thumb(i + 2)} style={styles.thumb} contentFit="cover" contentPosition="top" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {it.type}
                    </Text>
                    {it.description ? (
                      <Text style={styles.rowSub} numberOfLines={2}>
                        {it.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.price}>{money(it.price, cur)}</Text>
                </Animated.View>
              ))}
            </>
          ) : null}

          {options.length ? (
            <View style={styles.optBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Ionicons name="settings-outline" size={15} color={colors.primary} />
                <Text style={[styles.section, { marginTop: 0, marginBottom: 0 }]}>OPTIONS SUPPLÉMENTAIRES</Text>
              </View>
              {options.map((o, i) => (
                <View key={`o${i}`} style={styles.optRow}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                  <Text style={styles.optLabel} numberOfLines={2}>
                    {o.label}
                  </Text>
                  <Text style={styles.optValue}>+ {o.unit === "%" ? `${o.value} %` : money(o.value, cur)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {!p.pricing?.items?.length ? <Text style={styles.note}>Tarifs indicatifs : ce créateur n'a pas encore publié sa grille.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: Math.round(W * 0.78), paddingHorizontal: 20, paddingBottom: 46, backgroundColor: "#2A1A14" },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,18,14,0.35)", borderWidth: 1, borderColor: "rgba(255,248,243,0.3)" },
  name: { fontFamily: fonts.serif, color: "#FFF8F3", fontSize: 30, lineHeight: 36, flexShrink: 1 },
  heroSub: { color: "rgba(255,248,243,0.92)", fontSize: 14 },
  netRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  netCount: { color: "#FFF8F3", fontSize: 14, fontWeight: "700" },
  sheet: { marginTop: -28, marginHorizontal: 10, borderRadius: 26, padding: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: goldBorder },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 28 },
  brandChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: goldBorder },
  brandChipText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  curNote: { color: colors.muted, fontSize: 11, marginTop: 2 },
  section: { color: colors.primary, fontSize: 11, letterSpacing: 2.4, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderRadius: 16, backgroundColor: colors.bg, borderWidth: 1, borderColor: goldBorder, marginBottom: 8 },
  packRow: { paddingVertical: 12 },
  genericIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  thumb: { width: 38, height: 38, borderRadius: 9, backgroundColor: colors.surfaceHi },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  rowSub: { color: colors.inkSoft, fontSize: 11, marginTop: 1 },
  price: { color: colors.primary, fontSize: 13, fontWeight: "700", marginLeft: 4, flexShrink: 0 },
  optBox: { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: goldBorder },
  optRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  optLabel: { flex: 1, color: colors.ink, fontSize: 14 },
  optValue: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 12 },
});
