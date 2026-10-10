// Cartes d'annonces premium : verticale (carrousel / grille) et horizontale (liste Explorer).
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { GlossFill, GoldButton, luxShadow } from "../../lux";
import { budgetLabel, useDB } from "../../store";
import { colors, fonts } from "../../theme";
import type { ApplicationStatus, Offer, Profile } from "../../types";
import { Press } from "../../ui";
import { avatarOf, nameOf } from "../collab/common";
import { initials } from "../home/CreatorTile";

const W = Dimensions.get("window").width;
const src = (x: string | number) => (typeof x === "string" ? { uri: x } : x);
/** Logo de l'annonce (téléversé à la création) ou, à défaut, l'avatar de la marque. */
export const logoOf = (o: Offer, brand?: Profile) => (o.logo_url != null ? src(o.logo_url) : avatarOf(brand));

/** Badge selon la candidature du créateur (Nouveau / En attente / Accepté / Refusé). */
export const appBadge = (s?: ApplicationStatus): Badge =>
  !s
    ? AD_STATUS.new
    : s === "pending"
      ? AD_STATUS.pending
      : s === "accepted"
        ? { label: "Accepté", bg: "rgba(30,120,60,0.9)", fg: "#E9FFF0" }
        : { label: "Refusé", bg: "rgba(140,30,30,0.9)", fg: "#FFECEC" };

export const AD_W = Math.round(W * 0.7);
export const AD_H = Math.round(AD_W * 1.25);
export const AD_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  new: { label: "Nouveau", bg: "rgba(11,11,11,0.7)", fg: "#F8F6F2" },
  active: { label: "En cours", bg: "rgba(18,92,62,0.85)", fg: "#E9FFF4" },
  pending: { label: "En attente", bg: "rgba(30,64,160,0.85)", fg: "#EEF2FF" },
};
export const adStatus = (o: Offer) => (o.status === "draft" ? "pending" : Date.now() - new Date(o.created_at).getTime() < 7 * 864e5 ? "new" : "active");

export type Badge = { label: string; bg: string; fg: string };

export function AdCard({ o, brand, apps, width = AD_W, badge, compact }: { o: Offer; brand?: Profile; apps: number; width?: number; badge?: Badge; compact?: boolean }) {
  const img = o.images?.[0];
  const st = badge ?? AD_STATUS[adStatus(o)];
  return (
    <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.ad, { width, height: Math.round(width * (compact ? 1.68 : 1.25)) }, luxShadow]} scaleTo={0.98}>
      {img != null ? (
        <Image source={src(img)} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={styles.adFallback}>
          <GlossFill />
          <MaterialCommunityIcons name="bullhorn-variant-outline" size={54} color="rgba(217,172,101,0.35)" />
        </View>
      )}
      <LinearGradient colors={["rgba(5,5,5,0.35)", "rgba(5,5,5,0)", "rgba(5,5,5,0.55)", "#050505"]} locations={[0, 0.25, 0.5, 0.85]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(255,228,172,0.14)", "rgba(255,228,172,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.4 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.adLogo, compact && { width: 40, height: 40, borderRadius: 20, top: 10, left: 10 }]}>
        <Text style={styles.adLogoText}>{initials(nameOf(brand))}</Text>
        <Image source={logoOf(o, brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
      <View style={[styles.adBadge, { backgroundColor: st.bg }]}>
        <Text style={[styles.adBadgeText, { color: st.fg }]}>{st.label}</Text>
      </View>
      <View style={[styles.adBody, compact && { left: 10, right: 10, bottom: 10 }]}>
        <Text style={[styles.adTitle, compact && { fontSize: 13, lineHeight: 17 }]} numberOfLines={2}>{o.title}</Text>
        <View style={styles.adCat}>
          <Text style={styles.adCatText}>{o.category}</Text>
        </View>
        <View style={styles.adLine}>
          <MaterialCommunityIcons name="currency-usd" size={13} color="#0B0B0B" style={styles.adCoin} />
          <Text style={styles.adBudget} numberOfLines={1}>{budgetLabel(o)}</Text>
        </View>
        <View style={styles.adLine}>
          <Ionicons name="person-outline" size={12} color={colors.inkSoft} />
          <Text style={styles.adApps}>{apps} candidature{apps > 1 ? "s" : ""}</Text>
        </View>
        <GoldButton label={compact ? "Voir" : "Voir l'annonce"} size={compact ? "sm" : "md"} onPress={() => router.push(`/offer/${o.id}`)} style={{ marginTop: compact ? 6 : 10, alignSelf: "stretch" }} />
      </View>
    </Press>
  );
}


/** Carte horizontale pleine largeur (maquette Explorer › Offres). */
export function OfferRow({ o, brand, apps, badge }: { o: Offer; brand?: Profile; apps: number; badge?: Badge }) {
  const img = o.images?.[0];
  const st = badge ?? AD_STATUS[adStatus(o)];
  const userId = useDB((s) => s.userId);
  const favs = useDB((s) => s.offerFavs);
  const toggle = useDB((s) => s.toggleOfferFav);
  const fav = !!userId && favs.includes(`${userId}:${o.id}`);
  const place = o.presence_mode === "on_site" ? o.on_site_city || "Sur place" : o.location || "Tous les pays africains";
  return (
    <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.row, luxShadow]} scaleTo={0.985}>
      {img != null ? <Image source={src(img)} style={styles.rowImg} contentFit="cover" /> : <GlossFill />}
      <LinearGradient colors={["#050505", "rgba(5,5,5,0.82)", "rgba(5,5,5,0.15)", "rgba(5,5,5,0.55)", "rgba(5,5,5,0.92)"]} locations={[0, 0.3, 0.55, 0.72, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(255,228,172,0.12)", "rgba(255,228,172,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View style={styles.rowLeft}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={styles.rowLogo}>
            <Text style={styles.adLogoText}>{initials(nameOf(brand))}</Text>
            <Image source={logoOf(o, brand)} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={[styles.rowBadge, { backgroundColor: st.bg }]}>
              <Text style={[styles.adBadgeText, { color: st.fg }]}>{st.label}</Text>
            </View>
            <Text style={styles.rowTitle} numberOfLines={2}>{o.title}</Text>
            <View style={styles.adCat}>
              <Text style={styles.adCatText}>{o.category}</Text>
            </View>
          </View>
        </View>
        <View style={{ gap: 3, marginTop: 6 }}>
          <View style={styles.adLine}>
            <Ionicons name="camera-outline" size={13} color={colors.inkSoft} />
            <Text style={styles.rowMeta} numberOfLines={1}>{o.content_types.join(" • ")}</Text>
          </View>
          <View style={styles.adLine}>
            <Ionicons name="location-outline" size={13} color={colors.inkSoft} />
            <Text style={styles.rowMeta} numberOfLines={1}>{place}</Text>
          </View>
        </View>
      </View>
      <Press onPress={() => toggle(o.id)} style={styles.rowHeart} scaleTo={0.85}>
        <Ionicons name={fav ? "heart" : "heart-outline"} size={17} color={fav ? colors.primary : "#F8F6F2"} />
      </Press>
      <View style={styles.rowRight}>
        <Text style={styles.rowBudget} numberOfLines={2}>{budgetLabel(o)}</Text>
        <View style={styles.adLine}>
          <Ionicons name="people-outline" size={13} color={colors.inkSoft} />
          <Text style={styles.adApps}>{apps} candidature{apps > 1 ? "s" : ""}</Text>
        </View>
        <GoldButton label="Voir l'offre" size="sm" onPress={() => router.push(`/offer/${o.id}`)} style={{ marginTop: 6 }} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  ad: { borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth * 2, borderColor: "rgba(217,172,101,0.55)", backgroundColor: "#171717" },
  adFallback: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "flex-start", paddingTop: "28%", backgroundColor: "#171717" },
  adLogo: { position: "absolute", top: 12, left: 12, width: 54, height: 54, borderRadius: 27, overflow: "hidden", backgroundColor: "#050505", borderWidth: 1, borderColor: "rgba(217,172,101,0.6)", alignItems: "center", justifyContent: "center" },
  adLogoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 16 },
  adBadge: { position: "absolute", top: 14, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "rgba(248,246,242,0.18)" },
  adBadgeText: { fontSize: 10, fontWeight: "700" },
  adBody: { position: "absolute", left: 12, right: 12, bottom: 12, gap: 5 },
  adTitle: { color: "#F8F6F2", fontSize: 16, lineHeight: 20, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 },
  adCat: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(23,23,23,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  adCatText: { color: "#F8F6F2", fontSize: 10, fontWeight: "600" },
  adLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  adCoin: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#D9AC65", textAlign: "center", lineHeight: 16, overflow: "hidden" },
  adBudget: { color: "#D9AC65", fontSize: 13, fontWeight: "800", flexShrink: 1 },
  adApps: { color: colors.inkSoft, fontSize: 11 },
  row: { height: 168, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(217,172,101,0.5)", backgroundColor: "#171717" },
  rowImg: { position: "absolute", top: 0, bottom: 0, right: 0, width: "68%" },
  rowLeft: { position: "absolute", left: 12, top: 12, bottom: 12, width: "57%", justifyContent: "space-between" },
  rowLogo: { width: 50, height: 50, borderRadius: 25, overflow: "hidden", backgroundColor: "#050505", borderWidth: 1, borderColor: "rgba(217,172,101,0.6)", alignItems: "center", justifyContent: "center" },
  rowBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: "rgba(248,246,242,0.18)" },
  rowTitle: { color: "#F8F6F2", fontSize: 14, lineHeight: 18, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 },
  rowMeta: { color: "#E9E4DA", fontSize: 11, flexShrink: 1 },
  rowHeart: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(248,246,242,0.5)", backgroundColor: "rgba(5,5,5,0.45)", alignItems: "center", justifyContent: "center" },
  rowRight: { position: "absolute", right: 12, bottom: 12, width: "36%", alignItems: "flex-start", gap: 3 },
  rowBudget: { color: "#E7BE78", fontSize: 14, lineHeight: 17, fontWeight: "800" },
});
