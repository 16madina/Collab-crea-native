import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { landingFaces, landingHero } from "../src/data";
import { colors, radius, shadow, type } from "../src/theme";
import { Avatar, Button, Glass, IconButton, Logo } from "../src/ui";

const perks = [
  { icon: "people-outline", label: "Opportunités\nréelles" },
  { icon: "shield-checkmark-outline", label: "Paiements\nsécurisés" },
  { icon: "trending-up-outline", label: "Communauté\nen croissance" },
] as const;

const stats = [
  { n: "10 000+", l: "Créateurs\ninscrits" },
  { n: "500+", l: "Marques\nactives" },
  { n: "3 000+", l: "Campagnes\nréalisées" },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const enter = () => router.replace("/(tabs)/home");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.bg, colors.bgDeep]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Logo size={40} />
          <IconButton name="notifications-outline" badge />
        </View>

        {/* Héros */}
        <View style={styles.hero}>
          <Animated.View entering={FadeInRight.delay(150).springify()} style={styles.blob} />
          <Animated.View entering={FadeInRight.delay(250).springify()} style={styles.mainPhoto}>
            <Image source={landingHero.main} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(450).springify()} style={styles.secondPhoto}>
            <Image source={landingHero.second} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(650).springify()} style={styles.floatBadge}>
            <Glass style={styles.floatInner} intensity={60}>
              <View style={styles.floatIcon}>
                <Ionicons name="stats-chart" size={16} color="#fff" />
              </View>
              <View>
                <Text style={{ fontWeight: "800", color: colors.ink }}>+ de 500</Text>
                <Text style={type.tiny}>marques actives</Text>
              </View>
            </Glass>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(100).springify()} style={[type.display, styles.title]}>
            Les bonnes{"\n"}
            <Text style={{ color: colors.primary }}>collaborations</Text>
            {"\n"}font les grandes histoires.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ paddingHorizontal: 24, gap: 14 }}>
          <Text style={[type.body, { maxWidth: 300 }]}>
            Collab Créa connecte les créateurs de contenu africains avec les marques qui croient en leur talent.
          </Text>
          <Button label="Je suis créateur" onPress={enter} style={{ marginTop: 8 }} />
          <Button label="Je suis une marque" variant="outline" onPress={enter} />
        </Animated.View>

        <View style={styles.perks}>
          {perks.map((p, i) => (
            <Animated.View key={p.label} entering={FadeInDown.delay(450 + i * 90).springify()} style={styles.perk}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon} size={24} color={colors.ink} />
              </View>
              <Text style={styles.perkText}>{p.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(700).springify()} style={[styles.statsCard, shadow.soft]}>
          <LinearGradient colors={["#1B1B1B", "#0C0C0C"]} style={StyleSheet.absoluteFill} />
          <View style={styles.glowOrb} />
          <View style={{ flexDirection: "row" }}>
            {stats.map((s, i) => (
              <View key={s.n} style={[styles.stat, i > 0 && styles.statDivider]}>
                <Text style={styles.statN}>{s.n}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            ))}
          </View>
          <View style={styles.community}>
            <View style={{ flexDirection: "row" }}>
              {landingFaces.map((f, i) => (
                <View key={f} style={{ marginLeft: i ? -12 : 0, borderRadius: 22, borderWidth: 2, borderColor: colors.night }}>
                  <Avatar uri={f} size={38} />
                </View>
              ))}
              <View style={styles.plus}>
                <Ionicons name="add" size={22} color="#fff" />
              </View>
            </View>
            <Text style={{ color: "#fff", flex: 1, fontSize: 13, lineHeight: 18 }}>Rejoignez une communauté de créateurs talentueux</Text>
          </View>
        </Animated.View>

        <Text style={[type.small, { textAlign: "center", marginTop: 22 }]} onPress={enter}>
          Déjà membre ? <Text style={{ color: colors.primary, fontWeight: "700" }}>Se connecter</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24 },
  hero: { height: 420, marginTop: 16 },
  title: { position: "absolute", left: 24, top: 18, width: 250, fontSize: 35, lineHeight: 39 },
  blob: {
    position: "absolute",
    right: -40,
    top: 10,
    width: 240,
    height: 300,
    borderRadius: 120,
    backgroundColor: colors.primary,
    opacity: 0.9,
    transform: [{ rotate: "18deg" }],
  },
  mainPhoto: { position: "absolute", right: -10, top: 0, width: 190, height: 270, borderRadius: 100, overflow: "hidden" },
  secondPhoto: {
    position: "absolute",
    right: 60,
    top: 250,
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: "hidden",
    borderWidth: 5,
    borderColor: colors.night,
  },
  floatBadge: { position: "absolute", right: 16, top: 360 },
  floatInner: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md },
  floatIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  perks: { flexDirection: "row", justifyContent: "space-around", marginTop: 32, paddingHorizontal: 12 },
  perk: { alignItems: "center", gap: 10, flex: 1 },
  perkIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  perkText: { textAlign: "center", fontSize: 13, color: colors.ink, fontWeight: "500" },
  statsCard: { marginHorizontal: 16, marginTop: 30, borderRadius: radius.xl, overflow: "hidden", padding: 20, gap: 20 },
  glowOrb: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary, opacity: 0.18, right: -60, bottom: -90 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.12)" },
  statN: { color: colors.primary, fontSize: 22, fontWeight: "800" },
  statL: { color: "rgba(255,255,255,0.85)", textAlign: "center", fontSize: 12 },
  community: { flexDirection: "row", alignItems: "center", gap: 14 },
  plus: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, marginLeft: -12, alignItems: "center", justifyContent: "center" },
});
