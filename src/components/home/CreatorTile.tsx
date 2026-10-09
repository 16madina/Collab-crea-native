// Carte créateur partagée par l'accueil et la page d'arrivée.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useDB } from "../../store";
import { colors, radius } from "../../theme";
import type { Profile, SocialPlatform } from "../../types";
import { Press } from "../../ui";
import { formatFollowers, parseFollowers, PLATFORM } from "../account/constants";

export const totalFollowers = (p: Profile) => Object.values(p.followers).reduce((a, f) => a + parseFollowers(f), 0);
export const shortName = (full: string) => {
  const [first, ...rest] = full.split(" ");
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};
const platformsOf = (p: Profile) =>
  (Object.entries(p.followers) as [SocialPlatform, string][])
    .filter(([, v]) => parseFollowers(v) > 0)
    .sort((a, b) => parseFollowers(b[1]) - parseFollowers(a[1]))
    .map(([k]) => k);
const tagsOf = (p: Profile) => [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 2) as string[];

export function CreatorTile({ p, width, variant = "grid" }: { p: Profile; width: number; variant?: "grid" | "featured" }) {
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const isBrand = useDB((s) => s.profiles.find((x) => x.user_id === s.userId)?.role === "brand");
  const fav = favorites.some((f) => f.brand_id === userId && f.creator_id === p.user_id);
  const featured = variant === "featured";
  const open = () => router.push(`/profile/${p.user_id}`);
  const small = width < 125;

  return (
    <Press onPress={open} style={[styles.card, { width }]} scaleTo={0.97}>
      <View style={{ height: featured ? width * 1.05 : width * 1.0 }}>
        <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.65)"]} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
        <Press
          onPress={() => (isBrand ? toggleFavorite(p.user_id) : open())}
          style={styles.heart}
          scaleTo={0.8}
          hitSlop={8}
        >
          <Ionicons name={fav ? "heart" : "heart-outline"} size={15} color={fav ? colors.primary : colors.ink} />
        </Press>
        {featured && p.category ? (
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{p.category}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.body, small && { paddingHorizontal: 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={[styles.name, small && { fontSize: 13 }]} numberOfLines={1}>
            {shortName(p.full_name)}
          </Text>
          {p.identity_verified && <Ionicons name="checkmark-circle" size={13} color={colors.primary} />}
        </View>
        <Text style={styles.followers}>{formatFollowers(totalFollowers(p))} abonnés</Text>
        {!featured && (
          <View style={styles.tags}>
            {tagsOf(p).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText} numberOfLines={1}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.platforms}>
          {platformsOf(p)
            .slice(0, 3)
            .map((k) => (
              <Ionicons key={k} name={PLATFORM[k].icon} size={14} color={colors.inkSoft} />
            ))}
        </View>
        <View style={[styles.cta, featured && { height: 30 }]}>
          <Text style={styles.ctaText}>Voir le profil</Text>
        </View>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  heart: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(11,11,11,0.45)", borderWidth: 1, borderColor: "rgba(248,246,242,0.25)", alignItems: "center", justifyContent: "center" },
  catBadge: { position: "absolute", left: 8, bottom: 8, backgroundColor: colors.primaryPale, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  catBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: "700" },
  body: { padding: 10, gap: 4 },
  name: { color: colors.ink, fontWeight: "700", fontSize: 14, flexShrink: 1 },
  followers: { color: colors.inkSoft, fontSize: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  tag: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceHi, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2, maxWidth: "100%" },
  tagText: { color: colors.inkSoft, fontSize: 10, fontWeight: "600" },
  platforms: { flexDirection: "row", gap: 10, marginTop: 4 },
  cta: { marginTop: 6, height: 32, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  ctaText: { color: colors.onPrimary, fontWeight: "700", fontSize: 12 },
});
