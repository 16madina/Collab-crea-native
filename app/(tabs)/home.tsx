import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brands, categories, Category, heroSlides, me, offers } from "../../src/data";
import { colors, radius, shadow, type } from "../../src/theme";
import { Avatar, Button, IconButton, OfferCard, Press, SectionHeader } from "../../src/ui";

const W = Dimensions.get("window").width;
const SLIDE_W = W - 40;

export default function Home() {
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<Category>("all");
  const [slide, setSlide] = useState(0);
  const list = cat === "all" ? offers : offers.filter((o) => o.category === cat);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Avatar uri={me.avatar} size={56} ring />
        <View style={{ flex: 1 }}>
          <Text style={type.body}>Bonjour,</Text>
          <Text style={[type.h1, { fontSize: 22, lineHeight: 26 }]}>{me.name} 👋</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={type.small}>{me.role}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.muted} />
          </View>
        </View>
        <IconButton name="search-outline" />
        <IconButton name="notifications-outline" badge />
      </Animated.View>

      {/* Recherche */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput placeholder="Rechercher une campagne, une marque…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <Press style={[styles.filter, shadow.soft]}>
          <Ionicons name="options-outline" size={22} color={colors.ink} />
        </Press>
      </Animated.View>

      {/* Catégories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 6 }}>
        {categories.map((c, i) => {
          const on = c.key === cat;
          return (
            <Animated.View key={c.key} entering={FadeInDown.delay(120 + i * 50).springify()}>
              <Press onPress={() => setCat(c.key)} style={{ alignItems: "center", gap: 6 }} scaleTo={0.9}>
                <View style={[styles.catIcon, on ? [styles.catOn, shadow.glow] : styles.catOff]}>
                  <Ionicons name={c.icon} size={24} color={on ? "#fff" : colors.ink} />
                </View>
                <Text style={[styles.catLabel, on && { color: colors.primary, fontWeight: "700" }]}>{c.label}</Text>
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Carrousel */}
      <FlatList
        data={heroSlides}
        horizontal
        pagingEnabled={false}
        snapToInterval={SLIDE_W + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, marginTop: 18 }}
        onScroll={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 12)))}
        scrollEventThrottle={32}
        keyExtractor={(s) => s.title}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SLIDE_W }]}>
            <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            <LinearGradient
              colors={["rgba(12,12,12,0.95)", "rgba(12,12,12,0.7)", "rgba(12,12,12,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Button label={item.cta} small onPress={() => router.navigate("/(tabs)/campaigns")} style={{ alignSelf: "flex-start" }} />
          </View>
        )}
      />
      <View style={styles.dots}>
        {heroSlides.map((_, i) => (
          <Animated.View key={i} layout={LinearTransition.springify()} style={[styles.dotBase, i === slide && styles.dotOn]} />
        ))}
      </View>

      <SectionHeader title="Campagnes en vedette" onAction={() => router.navigate("/(tabs)/campaigns")} />
      <FlatList
        key={cat}
        data={list}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 12 }}
        keyExtractor={(o) => o.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 70).springify()}>
            <OfferCard offer={item} />
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={[type.body, { paddingVertical: 30 }]}>Aucune campagne dans cette catégorie pour l'instant.</Text>}
      />

      <SectionHeader title="Marques qui recrutent" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {brands.map((b) => (
          <Press key={b.name} style={[styles.brand, shadow.soft, { backgroundColor: b.color }]}>
            <Text style={{ color: b.text, fontWeight: "900", fontSize: 15 }}>{b.name}</Text>
          </Press>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 18, marginBottom: 14 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    backgroundColor: "#F1E8E2",
  },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  filter: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  catIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  catOn: { backgroundColor: colors.primary },
  catOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  catLabel: { fontSize: 13, color: colors.inkSoft, fontWeight: "500" },
  slide: { height: 200, borderRadius: radius.xl, overflow: "hidden", padding: 22, justifyContent: "space-between", backgroundColor: colors.night },
  slideTitle: { color: "#fff", fontSize: 24, lineHeight: 29, fontWeight: "800", maxWidth: 200, letterSpacing: -0.4 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dotBase: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D9CCC4" },
  dotOn: { width: 20, backgroundColor: colors.primary },
  brand: { width: 92, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
});
