// Onglet « Créateurs » de l'Explorer : grille 2 colonnes de cartes photo.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { Empty } from "../../kit";
import { GlossFill, GoldButton, GoldPill, goldBorder, luxShadow } from "../../lux";
import { useDB } from "../../store";
import { colors, fonts, radius } from "../../theme";
import type { Profile } from "../../types";
import { Press } from "../../ui";
import { formatFollowers } from "../account/constants";
import { initials, shortName, totalFollowers } from "../home/CreatorTile";

const W = Dimensions.get("window").width;
const GAP = 12;
const CARD_W = Math.floor((W - 32 - GAP) / 2);
const CATS = ["Toutes", "Beauté", "Mode", "Tech", "Cuisine", "Fitness", "Lifestyle", "Humour", "Voyage"];

function Card({ p }: { p: Profile }) {
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const isBrand = useDB((s) => s.profiles.find((x) => x.user_id === s.userId)?.role === "brand");
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const fav = favorites.some((f) => f.brand_id === userId && f.creator_id === p.user_id);
  const open = () => router.push(`/profile/${p.user_id}`);
  const tags = [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 2) as string[];

  return (
    <Press onPress={open} style={[styles.card, luxShadow]} scaleTo={0.97}>
      <View style={styles.mono}>
        <Text style={styles.monoText}>{initials(p.full_name)}</Text>
      </View>
      <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
      <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.55)", "rgba(11,11,11,0.95)"]} locations={[0.35, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <Press
        onPress={() => (!userId ? router.push("/auth/signup") : isBrand ? toggleFavorite(p.user_id) : open())}
        style={styles.heart}
        scaleTo={0.8}
        hitSlop={8}
      >
        <Ionicons name={fav ? "heart" : "heart-outline"} size={22} color={fav ? colors.primary : colors.ink} />
      </Press>
      <View style={styles.body}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={styles.name} numberOfLines={1}>
            {shortName(p.full_name)}
          </Text>
          {p.identity_verified && <Ionicons name="checkmark-circle" size={17} color={colors.primary} />}
        </View>
        <Text style={styles.followers}>{formatFollowers(totalFollowers(p))} abonnés</Text>
        <View style={styles.tags}>
          {tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
        <GoldButton label="Voir le profil" size="sm" onPress={open} style={styles.btn} />
      </View>
    </Press>
  );
}

export function CreatorsGrid({ searchOpen }: { searchOpen: boolean }) {
  const profiles = useDB((s) => s.profiles);
  const userId = useDB((s) => s.userId);
  const [cat, setCat] = useState("Toutes");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return profiles
      .filter((p) => p.role === "creator" && !p.is_banned && p.user_id !== userId)
      .filter((p) => cat === "Toutes" || p.category === cat || p.tags?.includes(cat))
      .filter((p) => !s || `${p.full_name} ${p.category} ${p.tags?.join(" ")} ${p.country}`.toLowerCase().includes(s))
      .sort((a, b) => totalFollowers(b) - totalFollowers(a));
  }, [profiles, userId, cat, q]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {searchOpen && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.search}>
          <GlossFill />
          <Ionicons name="search-outline" size={19} color={colors.inkSoft} />
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Nom, catégorie, pays…" placeholderTextColor={colors.muted} style={styles.input} />
        </Animated.View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}>
        {CATS.map((c) => (
          <GoldPill key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>
      {list.length === 0 ? (
        <Empty icon="people-outline" title="Aucun créateur trouvé" text="Essaie une autre catégorie ou une autre recherche." />
      ) : (
        <View style={styles.grid}>
          {list.map((p, i) => (
            <Animated.View key={p.user_id} entering={FadeInDown.delay(60 + (i % 6) * 60).springify()} layout={LinearTransition.springify()}>
              <Card p={p} />
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 48, marginHorizontal: 16, marginTop: 4, borderRadius: radius.pill, paddingHorizontal: 16, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: colors.ink, zIndex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, paddingHorizontal: 16 },
  card: { width: CARD_W, height: CARD_W * 1.27, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: "rgba(217,172,101,0.45)", backgroundColor: "#0E0E0E" },
  mono: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#141210" },
  monoText: { fontFamily: fonts.serif, color: "#D9AC65", opacity: 0.85, fontSize: 56 },
  heart: { position: "absolute", top: 10, right: 10, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  body: { position: "absolute", left: 10, right: 10, bottom: 10, gap: 2 },
  name: { color: colors.ink, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  followers: { color: colors.inkSoft, fontSize: 13 },
  tags: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  tag: { backgroundColor: "rgba(40,40,40,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: colors.ink, fontSize: 11, fontWeight: "600" },
  btn: { alignSelf: "stretch", marginTop: 8, height: 34 },
});
