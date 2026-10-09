import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import { flagOf, SearchBar } from "../src/components/collab/common";
import { Chip, Empty, Screen } from "../src/kit";
import { useDB } from "../src/store";
import { colors, radius, shadow, type } from "../src/theme";
import type { SocialPlatform } from "../src/types";
import { Press } from "../src/ui";

const CATS = ["Tous", "Beauté", "Mode", "Lifestyle", "Tech", "Cuisine", "Fitness", "Musique", "Humour"];
const NET_ICON: Record<SocialPlatform, keyof typeof Ionicons.glyphMap> = {
  instagram: "logo-instagram",
  tiktok: "logo-tiktok",
  youtube: "logo-youtube",
  snapchat: "logo-snapchat",
  facebook: "logo-facebook",
};

export default function Marketplace() {
  const profiles = useDB((s) => s.profiles);
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const [favOnly, setFavOnly] = useState(false);

  const isFav = (id: string) => favorites.some((f) => f.brand_id === userId && f.creator_id === id);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return profiles.filter(
      (p) =>
        p.role === "creator" &&
        !p.is_banned &&
        (cat === "Tous" || p.category === cat) &&
        (!favOnly || favorites.some((f) => f.brand_id === userId && f.creator_id === p.user_id)) &&
        (!t || `${p.full_name} ${p.category ?? ""} ${p.country ?? ""}`.toLowerCase().includes(t)),
    );
  }, [profiles, q, cat, favOnly, favorites, userId]);

  return (
    <Screen title="Trouver des créateurs" subtitle="Marketplace Collab Créa">
      <SearchBar value={q} onChange={setQ} placeholder="Nom, catégorie, pays…" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        <Chip label="Favoris" icon={favOnly ? "heart" : "heart-outline"} on={favOnly} onPress={() => setFavOnly((v) => !v)} />
        {CATS.map((c) => (
          <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
        <View style={{ width: 12 }} />
      </ScrollView>
      <Text style={type.small}>
        {list.length} créateur{list.length > 1 ? "s" : ""} trouvé{list.length > 1 ? "s" : ""}
      </Text>
      {list.length === 0 ? (
        <Empty icon="people-outline" title="Aucun créateur" text="Modifiez votre recherche ou vos filtres." />
      ) : (
        <View style={styles.grid}>
          {list.map((c, i) => {
            const fav = isFav(c.user_id);
            const nets = Object.entries(c.followers) as [SocialPlatform, string][];
            return (
              <Animated.View key={c.user_id} entering={FadeInDown.delay(Math.min(i, 8) * 50).springify()} layout={LinearTransition.springify()} style={styles.cell}>
                <Press onPress={() => router.push(`/profile/${c.user_id}`)} style={[styles.card, shadow.soft]} scaleTo={0.97}>
                  <Image source={c.avatar_url} style={styles.photo} contentFit="cover" transition={250} />
                  <Press onPress={() => toggleFavorite(c.user_id)} style={styles.heart} scaleTo={0.8}>
                    <Animated.View key={String(fav)} entering={ZoomIn.springify()}>
                      <Ionicons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.primary : colors.ink} />
                    </Animated.View>
                  </Press>
                  <View style={{ padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={[type.h3, { fontSize: 13, flexShrink: 1 }]} numberOfLines={1}>
                        {c.full_name}
                      </Text>
                      {c.identity_verified ? <Ionicons name="checkmark-circle" size={15} color="#2F80ED" /> : null}
                    </View>
                    <Text style={type.small} numberOfLines={1}>
                      {flagOf(c.country)} {c.country} · {c.category}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      {nets.length === 0 ? (
                        <Text style={type.tiny}>Aucun réseau vérifié</Text>
                      ) : (
                        nets.map(([k, v]) => (
                          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name={NET_ICON[k]} size={13} color={colors.inkSoft} />
                            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.ink }}>{v}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </Press>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  cell: { width: "48%" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  photo: { width: "100%", height: 150 },
  heart: { position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
});
