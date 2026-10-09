import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fcfa, me, portfolio, transactions } from "../../src/data";
import { colors, radius, shadow, type } from "../../src/theme";
import { Avatar, Button, Glass, IconButton, Press, SectionHeader } from "../../src/ui";

const TILE = (Dimensions.get("window").width - 40 - 16) / 3;

export default function Profile() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      {/* Couverture */}
      <View style={{ height: 230 }}>
        <Image source={portfolio[0]} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(0,0,0,0.25)", "rgba(251,244,239,0)", colors.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.topBar, { top: insets.top + 6 }]}>
          <IconButton name="share-outline" dark />
          <IconButton name="settings-outline" dark />
        </View>
      </View>

      <View style={{ alignItems: "center", marginTop: -70, paddingHorizontal: 20 }}>
        <Animated.View entering={ZoomIn.springify()} style={[styles.avatarWrap, shadow.soft]}>
          <Avatar uri={me.avatar} size={108} />
          <View style={styles.verified}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        </Animated.View>
        <Text style={[type.h1, { marginTop: 12 }]}>{me.fullName}</Text>
        <Text style={type.small}>
          {me.role} · {me.city}
        </Text>
        <Text style={[type.body, { textAlign: "center", marginTop: 10 }]}>{me.bio}</Text>

        <Glass style={styles.stats} intensity={50}>
          {[
            [me.followers, "Abonnés"],
            [String(me.collabs), "Collabs"],
            [`${me.rating} ★`, "Note"],
          ].map(([n, l], i) => (
            <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.line }]}>
              <Text style={[type.h2, { color: i === 2 ? colors.primary : colors.ink }]}>{n}</Text>
              <Text style={type.tiny}>{l}</Text>
            </View>
          ))}
        </Glass>

        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Button label="Modifier le profil" icon="create-outline" style={{ flex: 1 }} small />
          <Button label="Kit média" variant="outline" icon="document-text-outline" small />
        </View>
      </View>

      {/* Portefeuille */}
      <SectionHeader title="Portefeuille" action="Historique" />
      <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.wallet, shadow.soft]}>
        <LinearGradient colors={["#FF6B47", "#E8431F"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.orb} />
        <Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: "600" }}>Solde disponible</Text>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.8 }}>{fcfa(me.balance)}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Press style={styles.walletBtn}>
            <Ionicons name="arrow-up-outline" size={16} color={colors.primaryDark} />
            <Text style={{ fontWeight: "700", color: colors.primaryDark }}>Retirer</Text>
          </Press>
          <Glass style={styles.mm} intensity={20}>
            <Ionicons name="phone-portrait-outline" size={14} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Orange · Wave · MTN</Text>
          </Glass>
        </View>
      </Animated.View>
      <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        {transactions.map((t) => (
          <View key={t.id} style={styles.tx}>
            <View style={[styles.txIcon, !t.in && { backgroundColor: "#EEE7E2" }]}>
              <Ionicons name={t.in ? "arrow-down" : "arrow-up"} size={16} color={t.in ? colors.success : colors.inkSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.ink }}>{t.label}</Text>
              <Text style={type.tiny}>{t.date}</Text>
            </View>
            <Text style={{ fontWeight: "800", color: t.in ? colors.success : colors.ink }}>
              {t.in ? "+" : "−"}
              {fcfa(t.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Portfolio */}
      <SectionHeader title="Portfolio" action="Ajouter" />
      <View style={styles.grid}>
        {portfolio.map((p, i) => (
          <Animated.View key={p} entering={FadeInDown.delay(i * 50).springify()}>
            <Press style={{ width: TILE, height: TILE * 1.3, borderRadius: radius.md, overflow: "hidden" }}>
              <Image source={p} style={{ flex: 1 }} contentFit="cover" transition={250} />
            </Press>
          </Animated.View>
        ))}
      </View>

      <Text style={[type.small, { textAlign: "center", marginTop: 26 }]} onPress={() => router.replace("/")}>
        Se déconnecter
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", right: 20, flexDirection: "row", gap: 10 },
  avatarWrap: { borderRadius: 60, borderWidth: 4, borderColor: colors.bg },
  verified: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  stats: { flexDirection: "row", width: "100%", paddingVertical: 16, marginVertical: 18, backgroundColor: "rgba(255,255,255,0.75)" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  wallet: { marginHorizontal: 20, borderRadius: radius.xl, padding: 22, gap: 4, overflow: "hidden" },
  orb: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.14)", right: -50, top: -60 },
  walletBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingHorizontal: 16, height: 40, borderRadius: radius.pill },
  mm: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" },
  tx: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  txIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#DDF5E8", alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20 },
});
